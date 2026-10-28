import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const captions = new Set(['title', 'label', 'description', 'placeholder', 'aria-label', 'aria-description', 'alt', 'source', 'hint', 'help', 'tooltip', 'subtitle', 'emptyMessage', 'errorMessage', 'successMessage']);
const entities = {apos:"'", quot:'"', amp:'&', lt:'<', gt:'>', nbsp:' '};
export const normalize = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|apos|quot|amp|lt|gt|nbsp);/gi, (all,key) => key[0]==='#' ? String.fromCodePoint(parseInt(key.slice(key[1].toLowerCase()==='x'?2:1),key[1].toLowerCase()==='x'?16:10)) : entities[key]??all);
const meaningful = value => value!=='Ø' && /[\p{L}]/u.test(value) && !/^https?:\/\/|^\/[\w/?=&%-]+$|^[\w.-]+\.(?:png|svg|stl|ico|exe|cmd|json|csv)$/i.test(value);

// Inspect only displayed values, caption attributes and UI message/error sources.
// Values used for conditions, event handlers, styles and input values are not captions.
export function visibleKeys(root='src') {
  const found = new Map();
  function inspect(file) {
    const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    const add=(value,node)=>{value=decode(value).trim().replace(/\s+/g,' ');if(meaningful(value)){const key=normalize(value);if(!found.has(key))found.set(key,{source:value,file,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});}};
    function displayed(expr) {
      if(ts.isStringLiteralLike(expr))add(expr.text,expr);
      else if(ts.isTemplateExpression(expr))add(expr.head.text+expr.templateSpans.map((span,i)=>'{'+i+'}'+span.literal.text).join(''),expr);
      else if(ts.isParenthesizedExpression(expr))displayed(expr.expression);
      else if(ts.isConditionalExpression(expr)){displayed(expr.whenTrue);displayed(expr.whenFalse);}
      else if(ts.isBinaryExpression(expr)) {
        if([ts.SyntaxKind.PlusToken,ts.SyntaxKind.QuestionQuestionToken,ts.SyntaxKind.BarBarToken].includes(expr.operatorToken.kind)){displayed(expr.left);displayed(expr.right);}
        else if(expr.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken)displayed(expr.right);
      } else if(ts.isCallExpression(expr)&&/^(?:t|uiText|translate)$/.test(expr.expression.getText(ast))&&expr.arguments[0])displayed(expr.arguments[0]);
    }
    function walk(node) {
      if(ts.isJsxElement(node)&&['UserText','style','script'].includes(node.openingElement.tagName.getText(ast)))return;
      if(ts.isJsxText(node))add(node.text,node);
      if(ts.isJsxExpression(node)&&node.expression&&ts.isJsxElement(node.parent))displayed(node.expression);
      if(ts.isJsxAttribute(node)&&captions.has(node.name.getText(ast))&&node.initializer){if(ts.isJsxExpression(node.initializer)&&node.initializer.expression)displayed(node.initializer.expression);else if(ts.isStringLiteral(node.initializer))add(node.initializer.text,node.initializer);}
      if(ts.isPropertyAssignment(node)&&(captions.has(node.name.getText(ast).replace(/^['"]|['"]$/g,''))||node.name.getText(ast)==='name'&&file.endsWith('tooth-appearance.ts')))displayed(node.initializer);
      if(ts.isNewExpression(node)&&node.expression.getText(ast)==='Error'&&node.arguments?.[0]&&!/^['"`]?[A-Z_]+(?:\$\{[^}]+\})?['"`]?$/.test(node.arguments[0].getText(ast)))displayed(node.arguments[0]);
      if(ts.isCallExpression(node)&&/^(?:setError|setMessage|setMsg|setNotice|setSuccess|alert|confirm)$/.test(node.expression.getText(ast))&&node.arguments[0])displayed(node.arguments[0]);
      ts.forEachChild(node,walk);
    }
    walk(ast);
  }
  function list(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){if(item.name!=='i18n'&&!file.includes('rc29-preview'))list(file);}else if(/\.tsx?$/.test(file))inspect(file);}}
  list(root);
  return [...found.values()];
}
