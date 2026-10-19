# BuildFix 02 — AYA unknown catch error

## Hata

Production type-check sırasında `src/app/ai/page.tsx` içindeki `catch` değişkeni `unknown` olarak değerlendirilirken eski `dentayaError` çağrı sözleşmesi daha dar bir tip bekleyebiliyordu:

`TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error | DentayaErrorLike | null | undefined'.`

## Düzeltme

- `dentayaError(...)` merkezi olarak `unknown` kabul etmeye devam eder.
- AYA notification action catch bloğundaki değer, çağrıdan önce açıkça `Error | { message: string }` tipine normalize edilir.
- String ve diğer bilinmeyen değerler kullanıcıya güvenli bir fallback mesajıyla aktarılır.

Bu düzenleme hem güncel `unknown` kabul eden helper ile hem de daha dar eski helper bildirimiyle tip uyumludur.
