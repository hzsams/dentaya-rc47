export type CadToolAvailability = "live" | "preview" | "kernel" | "roadmap";

export type CadToolMatrixItem = {
  id: string;
  category: string;
  group: string;
  label: string;
  description: string;
  availability: CadToolAvailability;
  activation?: string;
};

const t = (
  id: string,
  category: string,
  group: string,
  label: string,
  description: string,
  availability: CadToolAvailability,
  activation?: string,
): CadToolMatrixItem => ({ id, category, group, label, description, availability, activation });

export const DENTAYA_CAD_TOOL_MATRIX: CadToolMatrixItem[] = [
  // Core / case setup
  t("job-setup", "Restorasyon", "Case Setup", "İş Tanımı / Restorasyon Setup", "CAD başlamadan önce diş bazlı monolitik, coping, cutback, geçici, teleskop, pontic ve attachment planını tanımlar.", "live", "command:job-setup"),
  t("anatomic-crown", "Restorasyon", "Crown / Coping", "Anatomik Kron", "Tam kontur kron çalışma tipi.", "preview", "stage:design"),
  t("coping", "Restorasyon", "Crown / Coping", "Coping", "Anatomik formdan altyapı/cutback çalışma tipi.", "preview", "command:job-setup"),
  t("pressed-crown", "Restorasyon", "Crown / Coping", "Pressed Crown", "Framework + overpress çalışma tipi.", "roadmap"),
  t("eggshell-crown", "Restorasyon", "Crown / Coping", "Geçici / Eggshell Crown", "Pre-op anatomisinden geçici kron yaklaşımı.", "preview", "command:job-setup"),
  t("overlay", "Restorasyon", "Crown / Coping", "Overlay", "Onlay / 3-4 kron benzeri kompleks restorasyon.", "roadmap"),
  t("offset-coping", "Restorasyon", "Crown / Coping", "Offset Coping", "Sabit kalınlıklı coping yaklaşımı.", "roadmap"),
  t("anatomic-pontic", "Restorasyon", "Pontic / Mock-up", "Anatomik Pontic", "Tam anatomik gövde tasarımı.", "preview", "command:job-setup"),
  t("reduced-pontic", "Restorasyon", "Pontic / Mock-up", "Reduced Pontic", "Cutback uygulanmış pontic.", "preview", "command:job-setup"),
  t("pressed-pontic", "Restorasyon", "Pontic / Mock-up", "Pressed Pontic", "Framework + overpress pontic.", "roadmap"),
  t("eggshell-pontic", "Restorasyon", "Pontic / Mock-up", "Eggshell Pontic", "Mevcut anatomi üzerinden geçici pontic.", "preview", "command:job-setup"),
  t("mockup", "Restorasyon", "Pontic / Mock-up", "Mock-up", "Deneme / snap-on anatomik tasarım.", "roadmap"),
  t("inlay-onlay", "Restorasyon", "Inlay / Onlay / Veneer", "Inlay / Onlay", "Tam anatomik inlay/onlay çalışma tipi.", "roadmap"),
  t("offset-inlay", "Restorasyon", "Inlay / Onlay / Veneer", "Offset Inlay", "Sabit kalınlıklı inlay altyapısı.", "roadmap"),
  t("veneer", "Restorasyon", "Inlay / Onlay / Veneer", "Veneer", "Preparasyon üzerinde anatomik veneer.", "roadmap"),
  t("waxup", "Restorasyon", "Copy / Wax-up", "Wax-up", "Taranmış wax-up'ın dijital kopya akışı.", "roadmap"),
  t("anatomic-waxup", "Restorasyon", "Copy / Wax-up", "Anatomik Wax-up", "Preparasyon üzerinde anatomik wax tasarım.", "roadmap"),
  t("reduced-waxup", "Restorasyon", "Copy / Wax-up", "Reduced Wax-up", "Cutback uygulanmış wax-up.", "roadmap"),
  t("pontic-waxup", "Restorasyon", "Copy / Wax-up", "Pontic Wax-up", "Eksik diş bölgesinde wax-up pontic.", "roadmap"),
  t("full-denture", "Restorasyon", "Removable", "Tam Protez", "Tam protez çalışma tipi.", "roadmap"),
  t("partial-denture", "Restorasyon", "Removable", "Parsiyel Protez", "Parsiyel framework çalışma tipi.", "roadmap"),
  t("bite-splint", "Restorasyon", "Removable", "Bite Splint", "Oklüzal splint çalışma tipi.", "roadmap"),
  t("primary-telescope", "Restorasyon", "Removable", "Primer Teleskop", "Primer teleskop kron çalışma tipi.", "preview", "command:job-setup"),
  t("secondary-telescope", "Restorasyon", "Removable", "Sekonder Teleskop", "Sekonder teleskop yapı.", "preview", "command:job-setup"),
  t("attachment-type", "Restorasyon", "Removable", "Attachment", "Topuz/ball, locator veya özel attachment içeren restorasyon çalışma tipi.", "preview", "command:job-setup"),

  // Margin
  t("margin-auto", "Marjin", "Detection", "Otomatik Marjin Tespiti", "Preparasyon sınırını otomatik/yarı otomatik bulma hedefi.", "kernel"),
  t("margin-edit", "Marjin", "Editing", "Kontrol Noktası Düzenle", "Mevcut marjin kontrol noktalarını düzenle.", "live", "tool:margin"),
  t("margin-free", "Marjin", "Editing", "Serbest Marjin Çiz", "Mesh üzerinde tıklayarak manuel marjin hattı oluştur.", "live", "tool:margin"),
  t("margin-magnetic", "Marjin", "Editing", "Yüzeye Projeksiyon", "Mevcut marjin noktalarını kaynak mesh yüzeyine snap/projekte eder.", "live", "command:project-margin"),
  t("margin-up", "Marjin", "Editing", "Marjini Yukarı Taşı", "Yüzey normalleri boyunca marjini +0.05 mm ofsetle.", "live", "command:margin-up"),
  t("margin-down", "Marjin", "Editing", "Marjini Aşağı Taşı", "Yüzey normalleri boyunca marjini -0.05 mm ofsetle.", "live", "command:margin-down"),
  t("margin-clear", "Marjin", "Editing", "Marjini Temizle", "Tüm marjin noktalarını sıfırla.", "live", "command:clear-margin"),
  t("margin-repair-draw", "Marjin", "Repair", "Repair / Draw", "Bozuk marjin bölgesini yeniden çizme akışı.", "kernel"),
  t("margin-smooth", "Marjin", "Repair", "Smooth Margin", "Kapalı marjin eğrisini yumuşatır ve tarama yüzeyine yeniden projekte eder.", "live", "command:smooth-margin"),
  t("scan-repair", "Marjin", "Repair", "Scan Repair", "Marjin çevresindeki mesh artifact / delik onarım hedefi.", "kernel"),
  t("scan-repair-reset", "Marjin", "Repair", "Reset Repaired Scan", "Onarılmış taramayı kaynak geometriye döndürme.", "roadmap"),
  t("margin-snap-distance", "Marjin", "Repair", "Snap Distance", "Manyetik marjin yakalama uzaklığı.", "kernel"),
  t("margin-repair-radius", "Marjin", "Repair", "Repair Radius", "Marjin onarım etki yarıçapı.", "kernel"),

  // Insertion / bottom
  t("axis-from-view", "Internal Fit", "Insertion Axis", "Görünümden Giriş Ekseni", "Kamera yönünü giriş ekseni olarak kullan.", "live", "command:set-axis"),
  t("axis-manual", "Internal Fit", "Insertion Axis", "Manuel Giriş Ekseni", "X/Y/Z giriş ekseni düzenleme.", "preview", "stage:margin"),
  t("undercut-map", "Internal Fit", "Insertion Axis", "Undercut Haritası", "Yüzey normallerini seçilen eksene göre renklendir.", "live", "view:undercut"),
  t("blockout-undercut", "Internal Fit", "Insertion Axis", "Undercut Block-out Preview", "Giriş eksenine göre retantif alanları blok-out önizleme geometrisiyle gösterir.", "preview", "command:blockout"),
  t("allow-undercut", "Internal Fit", "Insertion Axis", "Undercut İzni", "Kontrollü retansiyon / undercut limiti.", "kernel"),
  t("cement-gap", "Internal Fit", "Crown Bottom", "Cement Gap", "Servikal/Internal Fit geometri düzeltmesinde spacer hedefini uygular.", "live", "command:internal-fit"),
  t("cement-gap-zones", "Internal Fit", "Crown Bottom", "Cement Gap Zones", "Marjin, aksiyal ve radial bölgeler için ayrı gap hedefleri.", "live", "stage:margin"),
  t("axial-gap", "Internal Fit", "Crown Bottom", "Axial Gap", "Internal Fit içinde aksiyal boşluk hedefi.", "live", "stage:margin"),
  t("radial-gap", "Internal Fit", "Crown Bottom", "Radial Gap", "Internal Fit içinde radyal boşluk hedefi.", "live", "stage:margin"),
  t("crown-shell", "Internal Fit", "Crown Bottom", "Crown Shell", "Dış anatomiden iç offset yüzeyi üretir, servikal sınırı birleştirerek kapalı shell oluşturur.", "live", "command:crown-shell"),
  t("intaglio-nearest-fit", "Internal Fit", "Crown Bottom", "Preparation Fit", "İç shell vertexlerini kaynak taramaya en yakın yüzey boşluk hedefleriyle yaklaştırır.", "preview", "command:crown-shell"),
  t("cervical-stitch", "Internal Fit", "Crown Bottom", "Cervical Stitch", "Outer ve inner boundary kenarlarını yan duvar üçgenleriyle birleştirir.", "live", "command:crown-shell"),
  t("shell-wall", "Internal Fit", "Crown Bottom", "Shell Wall Thickness", "Outer-inner yüzey eşleşmesinden duvar kalınlığı hedefi üretir.", "live", "command:crown-shell"),
  t("shell-mesh-repair", "Mesh", "Repair", "Shell Mesh Repair", "Vertex weld, dejenere üçgen temizliği ve winding normalizasyonu uygular.", "live", "command:repair-shell"),
  t("horizontal-border", "Internal Fit", "Crown Border", "Horizontal Border", "Crown bottom yatay sınır parametresi.", "kernel"),
  t("angled-border", "Internal Fit", "Crown Border", "Angled Border", "Açılı crown border parametresi.", "kernel"),
  t("border-angle", "Internal Fit", "Crown Border", "Border Angle", "Sınır açısı kontrolü.", "kernel"),
  t("vertical-border", "Internal Fit", "Crown Border", "Vertical Border", "Dikey sınır parametresi.", "kernel"),
  t("milling-compensation", "Internal Fit", "Manufacturing", "Milling Compensation", "Internal Fit relief üzerinde takım erişimi için konservatif telafi uygular.", "preview", "stage:margin"),

  // Anatomy / placement
  t("tooth-library", "Anatomi", "Library", "Diş Kütüphanesi", "Anatomi preset / kütüphane seçimi.", "preview", "stage:design"),
  t("move-tooth", "Anatomi", "Placement", "Move", "Restorasyon konumunu XYZ eksenlerinde taşı.", "live", "stage:design"),
  t("rotate-tooth", "Anatomi", "Placement", "Rotate", "Restorasyonu döndür.", "live", "stage:design"),
  t("scale-tooth", "Anatomi", "Placement", "Scale", "Morfoloji ölçeğini değiştir.", "live", "stage:design"),
  t("directional-scale", "Anatomi", "Placement", "Directional Scaling", "Eksen bazlı ölçekleme hedefi.", "roadmap"),
  t("free-axis-scale", "Anatomi", "Placement", "Free Axis Scaling", "Serbest eksen ölçekleme.", "roadmap"),
  t("tooth-axis-scale", "Anatomi", "Placement", "Tooth-axis Scaling", "Diş eksenine göre ölçekleme.", "roadmap"),
  t("roi-freeform", "Anatomi", "Placement", "ROI Freeforming", "Seçili bölgeyi serbest şekillendirme.", "preview", "tool:add"),
  t("move-tooth-parts", "Anatomi", "Placement", "Move Tooth Parts", "Anatomik alt bölgeleri taşıma.", "kernel"),
  t("anterior-symmetry", "Anatomi", "Symmetry", "Anterior Symmetry", "Anterior estetik simetri düzenleme.", "kernel"),
  t("mirror-1to1", "Anatomi", "Symmetry", "1:1 Mirror", "Kontralateral anatomiyi aynalama.", "kernel"),
  t("copy-anatomy", "Anatomi", "Symmetry", "Copy Anatomy", "Pre-op / kontralateral referanstan anatomi kopyalama.", "kernel"),

  // Freeform
  t("sculpt-add", "Sculpt", "Freeforming", "Ekle", "Fırça altında yüzeyi normal yönünde büyüt.", "live", "tool:add"),
  t("sculpt-remove", "Sculpt", "Freeforming", "Azalt", "Fırça altında yüzeyi normal yönünde küçült.", "live", "tool:reduce"),
  t("sculpt-smooth", "Sculpt", "Freeforming", "Smooth", "Yerel yüzeyi yumuşat.", "live", "tool:smooth"),
  t("sculpt-flatten", "Sculpt", "Freeforming", "Flatten", "Fırça alanını yerel teğet düzleme yaklaştır.", "live", "tool:flatten"),
  t("shape-preserving-smooth", "Sculpt", "Freeforming", "Shape-preserving Smooth", "Form kaybını azaltan kontrollü smoothing.", "live", "setting:preserve-shape"),
  t("brush-size", "Sculpt", "Brush", "Brush Size", "Fırça etki alanını değiştir.", "live", "stage:design"),
  t("brush-strength", "Sculpt", "Brush", "Strength", "Fırça deformasyon gücünü değiştir.", "live", "stage:design"),
  t("brush-round", "Sculpt", "Brush", "Round / Ball Brush", "Yumuşak dairesel falloff.", "live", "setting:brush-round"),
  t("brush-pointed", "Sculpt", "Brush", "Pointed / Knife Brush", "Dar ve sivri falloff.", "live", "setting:brush-pointed"),
  t("brush-flat", "Sculpt", "Brush", "Flat Cylinder Brush", "Alan içinde daha sabit etki.", "live", "setting:brush-flat"),
  t("move-cusps", "Sculpt", "Anatomic Move", "Move Cusps", "Kusp bölgelerini ayrı taşıma için segment-aware çekirdek.", "kernel"),
  t("move-parts", "Sculpt", "Anatomic Move", "Move Tooth Parts", "Anatomik parçaları taşıma.", "kernel"),
  t("move-entire", "Sculpt", "Anatomic Move", "Move Entire Tooth", "Restorasyonun tamamını konumlandırma.", "live", "stage:design"),
  t("move-ridge", "Sculpt", "Anatomic Move", "Move Ridge", "Ridge bölgesini bölgesel taşıma.", "kernel"),
  t("hold-cusp", "Sculpt", "Constraints", "Hold Cusp Tips", "Sculpt sırasında cusp tepe bölgelerini koru.", "live", "setting:hold-cusp"),
  t("hold-equator", "Sculpt", "Constraints", "Hold Equator", "Sculpt sırasında ekvator bandını koru.", "live", "setting:hold-equator"),
  t("occlusal-only", "Sculpt", "Constraints", "Occlusal Movement Only", "Deformasyonu lokal Z/oklüzal eksene sınırla.", "live", "setting:occlusal-only"),

  // Adapt / contacts
  t("adapt-antagonist", "Adaptasyon", "Automatic Adapt", "Antagonist Adapt", "Karşıt çene mesafesine otomatik uyarlama.", "kernel"),
  t("adapt-adjacent", "Adaptasyon", "Automatic Adapt", "Adjacent Adapt", "Komşu diş kontaklarına otomatik uyarlama.", "kernel"),
  t("adapt-gingiva", "Adaptasyon", "Automatic Adapt", "Gingiva Adapt", "Gingiva / basal mesafesine uyarlama.", "kernel"),
  t("static-occlusion", "Adaptasyon", "Occlusion", "Static Occlusion", "Statik temas haritası / clearance önizlemesi.", "preview", "view:contact"),
  t("dynamic-occlusion", "Adaptasyon", "Occlusion", "Dynamic Occlusion", "Hareketli oklüzyon / artikülatör analizi.", "kernel"),
  t("approximal", "Adaptasyon", "Contacts", "Approximal Contact", "Proksimal temas hedefi ve harita.", "preview", "view:contact"),
  t("basal", "Adaptasyon", "Contacts", "Basal Adapt", "Pontic/wax-up gingiva ilişkisi.", "kernel"),
  t("intersection-map", "Analiz", "Intersections", "Intersection Map", "Antagonist/komşu/gingiva çakışma analizi.", "preview", "view:contact"),
  t("distance-map", "Analiz", "Intersections", "Distance Map", "Mesafe renk haritası.", "preview", "view:contact"),
  t("auto-cut-intersections", "Analiz", "Intersections", "Auto Cut Intersections", "Çakışan bölgeleri güvenli boolean ile kesme.", "kernel"),

  // Attachments / cutback / connectors
  t("attachment-library", "Yapısal", "Attachment", "Attachment Library", "Attachment geometrisi seçimi.", "roadmap"),
  t("attachment-add", "Yapısal", "Attachment", "Attachment Add", "Harici geometriyi boolean add ile birleştirme.", "kernel"),
  t("attachment-subtract", "Yapısal", "Attachment", "Attachment Subtract", "Harici geometriyi boolean subtract ile çıkarma.", "kernel"),
  t("attachment-transform", "Yapısal", "Attachment", "Move / Rotate / Scale", "Attachment konumlandırma.", "roadmap"),
  t("attachment-direction", "Yapısal", "Attachment", "Direction", "View/restorasyon/surface normal yön seçimi.", "roadmap"),
  t("cutback", "Yapısal", "Cutback", "Cutback / Shrinking", "Tam anatomiden framework üretimi.", "kernel"),
  t("connector-position", "Yapısal", "Connector", "Connector Position", "İki docking noktası seçerek connector oluştur.", "live", "tool:connector"),
  t("connector-docking", "Yapısal", "Connector", "Docking Points", "Restorasyon yüzeyinde iki docking noktası seç.", "live", "tool:connector"),
  t("connector-shape", "Yapısal", "Connector", "Connector Shape", "Round / oval connector kesitini ayarla.", "preview", "stage:contacts"),
  t("connector-qc", "Yapısal", "Connector", "Connector Thickness QC", "Kesit alanı / yükseklik / genişlik eşiklerini hesapla.", "live", "command:kernel-qc"),

  // General CAD tools
  t("measurement", "Analiz", "Tools", "Measurement Tool", "3D mesafe ölçümü.", "live", "tool:measure"),
  t("sectional-view", "Analiz", "Tools", "Sectional View", "Kesit düzlemi ile geometriyi incele.", "live", "view:section"),
  t("wireframe", "Analiz", "Tools", "Wireframe", "Mesh tel-kafes görünümü.", "live", "view:wireframe"),
  t("thickness-map", "Analiz", "Tools", "Thickness / Clearance Map", "Kaynak taramaya en yakın mesafeyi hedefe göre renklendir.", "preview", "view:thickness"),
  t("kernel-qc", "Analiz", "Tools", "CAD Kernel QC", "Mesh topolojisi, temas, undercut, marjin ve connector kalite raporu.", "live", "command:kernel-qc"),
  t("screenshot", "Analiz", "Tools", "Screenshot", "Viewport görüntüsü yakalama.", "roadmap"),
  t("pdf-export", "Analiz", "Tools", "PDF Export", "Sahne ve ölçüleri rapor PDF'ine aktarma.", "roadmap"),
  t("html-export", "Analiz", "Tools", "3D HTML Export", "Paylaşılabilir 3D web görünümü.", "roadmap"),
  t("jaw-movement", "Analiz", "Tools", "Jaw Movement", "Hasta çene hareket verisi içe aktarma.", "roadmap"),
  t("change-reconstruction", "Analiz", "Tools", "Change Reconstruction Type", "Restorasyon tipini proje içinde değiştirme.", "roadmap"),
  t("align-meshes", "Mesh", "Editing", "Align Meshes", "İki mesh için rigid registration/hizalama.", "kernel"),
  t("adjust-light", "Analiz", "Tools", "Adjust Light", "Sanal ışık ve render görünümü.", "roadmap"),
  t("annotation", "Analiz", "Tools", "Annotation Editor", "3D sahneye açıklama/işaret ekleme.", "roadmap"),
  t("image-management", "Analiz", "Tools", "Image Management", "Ekran görüntüsü / görsel notlarını yönetme.", "roadmap"),
  t("add-mesh", "Mesh", "Editing", "Add Mesh", "Harici mesh ekleme.", "roadmap"),
  t("remove-mesh", "Mesh", "Editing", "Remove Mesh", "Harici mesh kaldırma.", "roadmap"),
  t("crop-mesh", "Mesh", "Editing", "Crop", "Mesh bölgesi kırpma.", "kernel"),
  t("delete-area", "Mesh", "Editing", "Delete Area", "Seçili mesh alanını silme.", "kernel"),
  t("surface-correction", "Mesh", "Editing", "Surface Correction", "Mesh yüzey artifact düzeltme.", "kernel"),
  t("gap-bridging", "Mesh", "Editing", "Gap Bridging", "Mesh boşluklarını kontrollü kapatma.", "kernel"),
  t("triangle-cut", "Mesh", "Editing", "Triangle Cut", "Üçgen tabanlı mesh kesimi.", "kernel"),
  t("clean-cut", "Mesh", "Editing", "Clean Cut", "Daha temiz sınır üretmeye yönelik mesh kesimi.", "kernel"),

  // Implant
  t("scanbody-match", "İmplant", "Implant", "Scanbody Matching", "Scanbody kütüphane eşleştirmesi.", "kernel"),
  t("implant-library", "İmplant", "Implant", "Implant Library", "İmplant komponent/kütüphane seçimi.", "roadmap"),
  t("implant-position", "İmplant", "Implant", "Implant Position", "İmplant pozisyonunu görselleştirme/ilişkilendirme.", "roadmap"),
  t("emergence-profile", "İmplant", "Implant", "Emergence Profile", "Gingivadan çıkış profilini tasarlama.", "kernel"),
  t("abutment-bottom", "İmplant", "Implant", "Abutment Bottom", "İmplant interface ve alt yüzey.", "kernel"),
  t("custom-abutment", "İmplant", "Implant", "Custom Abutment", "Kişiye özel abutment tasarımı.", "kernel"),
  t("screw-channel", "İmplant", "Implant", "Screw Channel", "Vida kanalı geometrisi.", "kernel"),
  t("angulated-screw", "İmplant", "Implant", "Angulated Screw Channel", "Açılı vida kanalı workflow'u.", "kernel"),
  t("suprastructure", "İmplant", "Implant", "Suprastructure", "İmplant üstü framework/suprastructure.", "kernel"),

  // Bar
  t("bar-pillar", "Bar", "Bar", "Pillar", "Bar pillar geometrisi.", "kernel"),
  t("bar-segment", "Bar", "Bar", "Bar Segment", "Pillarlar arası bar segmenti.", "kernel"),
  t("bar-profile", "Bar", "Bar", "Profile", "Bar profil kesiti ve düzenleme.", "kernel"),
  t("bar-borders", "Bar", "Bar", "Borders", "Bar/pillar sınırları.", "kernel"),
  t("bar-control-points", "Bar", "Advanced", "Profile Control Points", "Kontrol noktalarıyla bar formu.", "kernel"),
  t("bar-aux-planes", "Bar", "Advanced", "Auxiliary Planes", "Referans düzlemleri.", "roadmap"),
  t("bar-secondary-axis", "Bar", "Advanced", "Secondary Insertion Axis", "Sekonder yapı giriş ekseni.", "kernel"),
  t("bar-round-edgy", "Bar", "Advanced", "Round / Edgy", "Bar profil kenar karakteri.", "kernel"),
  t("bar-gingiva-distance", "Bar", "Advanced", "Distance to Gingiva", "Bar-gingiva mesafesi.", "kernel"),
  t("bar-crop", "Bar", "Advanced", "Crop", "Bar geometri kırpma.", "kernel"),
  t("bar-pulldown", "Bar", "Advanced", "Pull-down", "Barı gingivaya adaptasyon.", "kernel"),
  t("bar-auto-level", "Bar", "Advanced", "Auto Level", "Bar yüksekliğini homojenleştirme.", "kernel"),
  t("bar-min-pillar-angle", "Bar", "Advanced", "Minimum Pillar Angle", "Pillar açı limiti.", "kernel"),
  t("bar-retention", "Bar", "Attachments", "Retention", "Retantif bar geometrisi.", "kernel"),
  t("split-denture", "Bar", "Hybrid", "Split Denture / Hybrid", "Bar ve suprastructure'ı eşleşen iki parçaya ayırma.", "kernel"),

  // Splint
  t("splint-axis", "Splint", "Workflow", "Splint Insertion Axis", "Splint giriş ekseni.", "kernel"),
  t("splint-bottom", "Splint", "Workflow", "Splint Bottom", "Alt yüzey / spacer üretimi.", "kernel"),
  t("splint-top", "Splint", "Workflow", "Splint Top", "Splint üst yüzey tasarımı.", "kernel"),
  t("splint-offset", "Splint", "Parameters", "Offset", "Model-splint spacer hedefi.", "kernel"),
  t("splint-draft", "Splint", "Parameters", "Angle / Draft", "Giriş eksenine göre draft.", "kernel"),
  t("splint-undercut", "Splint", "Parameters", "Allow Undercuts Up To", "Retansiyon/undercut limiti.", "kernel"),
  t("splint-min-thickness", "Splint", "Parameters", "Minimum Thickness", "Minimum splint kalınlığı.", "kernel"),
  t("splint-milling-diameter", "Splint", "Parameters", "Milling Diameter", "CAM takım çapı kompanzasyon hedefi.", "kernel"),
  t("splint-auto-segmentation", "Splint", "Automation", "Automated Segmentation", "Diş segmentasyonu ve sınır otomasyonu.", "roadmap"),

  // Partial
  t("partial-survey", "Parsiyel", "Partial Framework", "Survey Tool", "Survey/blockout ve refractory model analizi.", "kernel"),
  t("partial-edit-wax", "Parsiyel", "Partial Framework", "Edit Wax", "Wax ekle/çıkar/smooth.", "kernel"),
  t("partial-curve", "Parsiyel", "Partial Framework", "Curve Tool", "Framework eğrisi çizimi.", "kernel"),
  t("partial-major", "Parsiyel", "Partial Framework", "Major Connector", "Major connector mesh tasarımı.", "kernel"),
  t("partial-clasp", "Parsiyel", "Partial Framework", "Clasp / Minor Connector", "Kroşe ve minor connector tasarımı.", "kernel"),
  t("partial-clone", "Parsiyel", "Partial Framework", "Clone Tool", "Wax/guide plane/rest kopyalama.", "kernel"),
  t("partial-finish-line", "Parsiyel", "Partial Framework", "Finish Line", "Finish line profilleri.", "kernel"),
  t("partial-assemble", "Parsiyel", "Partial Framework", "Assemble Parts", "Framework/gingiva/diş parçalarını birleştirme.", "kernel"),
  t("partial-build", "Parsiyel", "Partial Framework", "Build", "Final framework output.", "kernel"),
  t("partial-bar", "Parsiyel", "Partial Framework", "Bar Tool", "Lingual bar vb. bar üretimi.", "kernel"),
  t("partial-pipe", "Parsiyel", "Partial Framework", "Pipe Tool", "Yuvarlak wax/support bar.", "kernel"),
  t("partial-post", "Parsiyel", "Partial Framework", "Post Tool", "Mesh support post.", "kernel"),
  t("partial-add-parts", "Parsiyel", "Partial Framework", "Add Parts", "Harici CAD parçalarını framework'e dahil etme.", "kernel"),

  // Denture
  t("denture-model-analysis", "Tam Protez", "Denture", "Model Analysis", "Ark ve kullanılabilir protez alanı analizi.", "kernel"),
  t("denture-tooth-placement", "Tam Protez", "Denture", "Tooth Placement", "Protez dişlerinin başlangıç yerleşimi.", "kernel"),
  t("denture-correct-placement", "Tam Protez", "Denture", "Correct Tooth Placement", "Diş dizimini düzeltme.", "kernel"),
  t("denture-base-bottom", "Tam Protez", "Denture", "Denture Base Bottom", "Kaide alt yüzeyi.", "kernel"),
  t("denture-base-design", "Tam Protez", "Denture", "Denture Base Design", "Kaide geometrisi.", "kernel"),
  t("denture-chain", "Tam Protez", "Placement", "Chain Mode", "Dişleri temas ilişkisini koruyan zincir olarak taşıma.", "kernel"),
  t("denture-lock-relation", "Tam Protez", "Placement", "Lock Relation", "Dişler arası ilişkiyi kilitleme.", "kernel"),
  t("denture-opposite-pair", "Tam Protez", "Placement", "Opposite as Pair", "Karşıt dişleri çift olarak düzenleme.", "kernel"),
  t("denture-keep-contacts", "Tam Protez", "Placement", "Keep Contacts", "Dizim sırasında kontakları koruma.", "kernel"),
  t("duplicate-denture", "Tam Protez", "Denture", "Duplicate Denture", "Mevcut protez taramasından yeni protez.", "kernel"),
  t("overdenture", "Tam Protez", "Denture", "Overdenture", "Locator/ball attachment destekli protez akışı.", "kernel"),

  // Model creator
  t("model-alignment", "Model", "Model Creator", "Model Alignment", "Model pozisyonu ve tipini ayarla.", "kernel"),
  t("model-segmentation", "Model", "Model Creator", "Model Segmentation", "Prep/die segmentasyonu.", "kernel"),
  t("die-parameters", "Model", "Model Creator", "Die Parameters", "Pin, seating, taper, groove vb. die parametreleri.", "kernel"),
  t("model-wall-thickness", "Model", "Model Creator", "Wall Thickness", "Model duvar kalınlığı / solid-hollow kontrolü.", "kernel"),
  t("model-bottom-sill", "Model", "Model Creator", "Bottom Sill", "Build plate temas tabanı.", "kernel"),
  t("model-hollow", "Model", "Model Creator", "Hollow Model", "İçi boş model üretimi.", "kernel"),
  t("model-milling", "Model", "Model Creator", "Anticipate Milling", "Freze üretimi için model telafisi.", "kernel"),
  t("gingiva-mask", "Model", "Model Creator", "Gingiva Mask", "Çıkarılabilir yumuşak doku maskesi.", "kernel"),
  t("model-analog", "Model", "Implant Model", "Model Analog", "İmplant analog yuvası.", "kernel"),
  t("model-text", "Model", "Model Creator", "Text / Labels", "Model üzerine üretim etiketi/metin.", "roadmap"),
  t("print-articulator", "Model", "Model Creator", "Printable Articulator Interface", "3D baskı articulator bağlantı geometrisi.", "kernel"),

  // Articulator / motion
  t("virtual-articulator", "Hareket", "Articulator", "Virtual Articulator", "Matematiksel artikülatör hareket simülasyonu.", "kernel"),
  t("protrusion", "Hareket", "Articulator", "Protrusion", "Protrüziv hareket analizi.", "kernel"),
  t("retrusion", "Hareket", "Articulator", "Retrusion", "Retrüziv hareket analizi.", "kernel"),
  t("lateral-left", "Hareket", "Articulator", "Left Lateral", "Sol lateral hareket analizi.", "kernel"),
  t("lateral-right", "Hareket", "Articulator", "Right Lateral", "Sağ lateral hareket analizi.", "kernel"),
  t("jaw-motion-import", "Hareket", "Patient Motion", "Jaw Motion Import", "Hasta-özel hareket verisini içe aktarma.", "roadmap"),
  t("virtual-imprint", "Hareket", "Patient Motion", "Virtual Imprint", "Hasta hareketinden dinamik interferans izi.", "kernel"),

  // Smile / visualization
  t("photo-align", "Smile", "Smile Design", "2D/3D Photo Alignment", "Hasta fotoğrafını 3D çene ile hizalama.", "roadmap"),
  t("facial-reference", "Smile", "Smile Design", "Facial Reference", "Yüz referanslarını tasarıma bağlama.", "roadmap"),
  t("smile-proportions", "Smile", "Smile Design", "Smile Proportions", "Gülüş oranları ve diş konumu.", "roadmap"),
  t("lip-line", "Smile", "Smile Design", "Lip-line Detection", "Dudak hattı referansı.", "roadmap"),
  t("photoreal-preview", "Smile", "Visualization", "Photoreal Preview", "Restorasyonun sunum amaçlı render önizlemesi.", "roadmap"),
  t("tooth-color", "Smile", "Visualization", "Tooth Color", "Sunum amaçlı restorasyon rengi.", "roadmap"),

  // Telescope / post-core
  t("telescope-friction", "İleri Restorasyon", "Telescopic", "Friction Surface", "Teleskop sürtünme yüzeyi.", "kernel"),
  t("telescope-conical", "İleri Restorasyon", "Telescopic", "Conical Segment", "Konik teleskop segmenti.", "kernel"),
  t("telescope-angle", "İleri Restorasyon", "Telescopic", "Telescopic Angle", "Segment bazlı teleskop açıları.", "kernel"),
  t("telescope-friction-map", "İleri Restorasyon", "Telescopic", "Friction Visualization", "Sürtünme/retansiyon haritası.", "kernel"),
  t("post-inner-margin", "İleri Restorasyon", "Post & Core", "Inner Margin", "Kanal içi sınır tanımı.", "kernel"),
  t("post-axis", "İleri Restorasyon", "Post & Core", "Post Insertion Direction", "Post giriş yönü.", "kernel"),
  t("post-bottom", "İleri Restorasyon", "Post & Core", "Post Bottom", "Post alt geometri üretimi.", "kernel"),
  t("core-design", "İleri Restorasyon", "Post & Core", "Core Design", "Core form ve destek tasarımı.", "kernel"),

  // AI / collaboration / manufacturing
  t("ai-design", "AI", "Design Assist", "AYA Design Assist", "Preparation/adjacent/antagonist bağlamından tasarım önerisi için gelecek model servisi.", "roadmap"),
  t("multi-tooth-segmentation", "AI", "Segmentation", "Multi-tooth Segmentation", "Çoklu diş segmentasyonu.", "roadmap"),
  t("nesting", "Üretim", "Manufacturing", "Nesting", "Restorasyonu blank/block içinde konumlandırma.", "roadmap"),
  t("multilayer-nesting", "Üretim", "Manufacturing", "Multi-layer Nesting", "Katmanlı materyalde renk/pozisyon ilişkisi.", "roadmap"),
  t("save-scene", "Dosya", "Save / Export", "Save Scene", "DentAYA CAD proje durumunu kaydet.", "live", "command:save"),
  t("save-version", "Dosya", "Save / Export", "Save Version", "Yeni tasarım versiyonu oluşturma.", "live", "stage:review"),
  t("export-stl", "Dosya", "Save / Export", "STL Export", "Aktif restorasyon mesh'ini STL olarak oluştur.", "live", "stage:review"),
  t("case-share", "Dosya", "Collaboration", "Case Share", "Klinik/lab tasarım review ve vaka paylaşımı.", "live", "stage:review"),

  // View / utility tools from the design environment
  t("undo", "Analiz", "Tools", "Undo", "Son geometri değişikliğini geri al.", "live", "command:undo"),
  t("redo", "Analiz", "Tools", "Redo", "Geri alınan geometri değişikliğini yinele.", "live", "command:redo"),
  t("fit-view", "Analiz", "Tools", "Fit View", "Aktif modeli viewport'a sığdır.", "live", "command:fit"),
  t("show-distances", "Analiz", "Display", "Show Distances", "Temas/clearance mesafelerini renk haritasıyla göster.", "preview", "view:contact"),
  t("color-texture", "Analiz", "Display", "Color / Texture", "Mesh renk ve texture görünümü.", "roadmap"),
  t("cut-view", "Analiz", "Display", "Cut View", "Kesit/cut görünümü.", "live", "view:section"),
  t("smile-window", "Smile", "Display", "Smile Window", "Smile tasarım sunum penceresi.", "roadmap"),
  t("cloud-services", "AI", "Cloud", "Cloud Services", "AI/segmentasyon gibi bulut servis katmanı.", "roadmap"),
  t("share-webview", "Dosya", "Collaboration", "Webview Share Link", "3D vaka görünümünü web linki üzerinden paylaşma.", "roadmap"),
  t("trusmile-video", "Smile", "Visualization", "Treatment Visualization Video", "Tedavi/tasarım görselleştirme videosu.", "roadmap"),

  // Detailed attachment controls
  t("attachment-move", "Yapısal", "Attachment", "Attachment Move", "Attachment konumunu taşı.", "roadmap"),
  t("attachment-rotate", "Yapısal", "Attachment", "Attachment Rotate", "Attachment geometrisini döndür.", "roadmap"),
  t("attachment-scale", "Yapısal", "Attachment", "Attachment Scale", "Attachment geometrisini ölçeklendir.", "roadmap"),
  t("attachment-dir-restoration", "Yapısal", "Attachment Direction", "Restoration Direction", "Attachment yönünü restorasyon eksenine göre belirle.", "roadmap"),
  t("attachment-dir-view", "Yapısal", "Attachment Direction", "View Direction", "Attachment yönünü kamera görünümüne göre belirle.", "roadmap"),
  t("attachment-dir-normal", "Yapısal", "Attachment Direction", "Surface Normal", "Attachment yönünü mesh yüzey normaline göre belirle.", "roadmap"),

  // Implant detailed tools
  t("abutment-min-thickness", "İmplant", "Abutment", "Minimum Thickness", "Abutment minimum kalınlık kontrolü.", "kernel"),
  t("abutment-gingiva", "İmplant", "Abutment", "Gingiva Relation", "Abutment-gingiva ilişkisi.", "kernel"),
  t("abutment-support", "İmplant", "Abutment", "Restoration Support", "Üst restorasyon için destek formu.", "kernel"),
  t("implant-interface", "İmplant", "Abutment", "Implant Interface", "Kütüphane kontrollü implant bağlantı geometrisi.", "kernel"),
  t("abutment-preset", "İmplant", "Abutment", "Custom Abutment Preset", "Abutment parametre presetini kaydet / yeniden kullan.", "roadmap"),
  t("implant-component-preview", "İmplant", "Library", "3D Component Preview", "Kütüphane komponentlerini 3D önizle.", "roadmap"),

  // Bar detailed profile and attachment tools
  t("bar-bars-pillars", "Bar", "Profile", "Bars + Pillars", "Bar ve pillar birlikte profil düzenleme.", "kernel"),
  t("bar-only", "Bar", "Profile", "Bar Only", "Yalnız bar segmentlerini düzenle.", "kernel"),
  t("bar-pillars-only", "Bar", "Profile", "Pillars", "Yalnız pillar geometrisini düzenle.", "kernel"),
  t("bar-border-implant", "Bar", "Advanced", "Border Around Implants", "İmplant/papilla çevresinde boşluk sınırı.", "kernel"),
  t("bar-attachment", "Bar", "Attachments", "Attachment", "Bar üzerine ek attachment geometrisi.", "kernel"),
  t("bar-bolted", "Bar", "Attachments", "Bolted", "Bar üzerinden subtract edilen bağlantı geometrisi.", "kernel"),
  t("bar-visualizer", "Bar", "Attachments", "Visualizer", "Üretim geometrisine katılmayan referans objesi.", "roadmap"),

  // Splint complete workflow
  t("splint-standard", "Splint", "Mode", "Standard", "Standart splint tasarım yaklaşımı.", "kernel"),
  t("splint-fill-gap", "Splint", "Mode", "Fill Gap for Missing Tooth", "Eksik diş boşluğunu dolduran splint yaklaşımı.", "kernel"),
  t("splint-tabletop", "Splint", "Mode", "Table Top / Tooth Library Anatomy", "Diş kütüphanesi anatomisiyle table-top yaklaşımı.", "kernel"),
  t("splint-smoothing", "Splint", "Parameters", "Smoothing", "Splint alt yüzey smoothing kontrolü.", "kernel"),
  t("splint-freeform", "Splint", "Workflow", "Freeforming", "Splint yüzeyini serbest şekillendirme.", "kernel"),
  t("splint-antagonist", "Splint", "Workflow", "Antagonist Adaptation", "Splint yüzeyini antagoniste uyarlama.", "kernel"),
  t("splint-merge", "Splint", "Workflow", "Merge", "Splint parçalarını final mesh'e birleştirme.", "kernel"),
  t("splint-auto-boundary", "Splint", "Automation", "Automatic Splint Boundary", "Segmentasyondan splint sınırı üretme.", "roadmap"),
  t("splint-margin-offset", "Splint", "Automation", "Margin Offset", "Otomatik splint sınırı offset kontrolü.", "roadmap"),

  // Provisional
  t("provisional-shoulder-width", "Provisional", "Crown Bottom", "Shoulder Width", "Geçici kron shoulder genişliği.", "kernel"),
  t("provisional-shoulder-slope", "Provisional", "Crown Bottom", "Shoulder Slope", "Geçici kron shoulder eğimi.", "kernel"),
  t("provisional-taper", "Provisional", "Crown Bottom", "Taper", "Geçici kron taper parametresi.", "kernel"),

  // Partial curve system and framework parameters
  t("curve-draw", "Parsiyel", "Curve", "Draw", "Yeni framework eğrisi çiz.", "kernel"),
  t("curve-replace", "Parsiyel", "Curve", "Replace", "Seçili curve bölümünü yeniden çiz.", "kernel"),
  t("curve-edit", "Parsiyel", "Curve", "Edit", "Curve kontrol noktalarını düzenle.", "kernel"),
  t("curve-fit-mesh", "Parsiyel", "Curve", "Fit Curve to Mesh", "Curve'ü mesh yüzeyine projekte et.", "kernel"),
  t("curve-two-point", "Parsiyel", "Curve", "Two Point", "İki noktalı curve segmenti.", "kernel"),
  t("curve-t-junction", "Parsiyel", "Curve", "T-Junction", "T bağlantılı curve topolojisi.", "kernel"),
  t("curve-open-loop", "Parsiyel", "Curve", "Open Loop", "Açık curve döngüsü.", "kernel"),
  t("major-stipple-pattern", "Parsiyel", "Major Connector", "Stipple Pattern", "Major connector yüzey dokusu.", "kernel"),
  t("major-stipple-scale", "Parsiyel", "Major Connector", "Stipple Scale", "Stipple ölçeği.", "kernel"),
  t("major-stipple-thickness", "Parsiyel", "Major Connector", "Stipple Thickness", "Stipple kalınlığı.", "kernel"),
  t("major-base-thickness", "Parsiyel", "Major Connector", "Base Thickness", "Major connector temel kalınlığı.", "kernel"),
  t("major-linear-falloff", "Parsiyel", "Major Connector", "Linear Falloff", "Connector sınır geçişi falloff'u.", "kernel"),
  t("partial-round-holes", "Parsiyel", "Mesh Pattern", "Round Holes", "Yuvarlak delikli retansiyon mesh'i.", "kernel"),
  t("partial-square-holes", "Parsiyel", "Mesh Pattern", "Square Holes", "Kare delikli retansiyon mesh'i.", "kernel"),
  t("partial-solid-mesh", "Parsiyel", "Mesh Pattern", "Solid Mesh", "Deliksiz solid mesh.", "kernel"),
  t("partial-hole-size", "Parsiyel", "Mesh Pattern", "Hole Size", "Mesh delik boyutu.", "kernel"),
  t("partial-mesh-wax", "Parsiyel", "Mesh Pattern", "Mesh Wax Thickness", "Mesh wax kalınlığı.", "kernel"),
  t("partial-relief-wax", "Parsiyel", "Mesh Pattern", "Relief Wax", "Alt yapı relief wax miktarı.", "kernel"),
  t("partial-pattern-position", "Parsiyel", "Mesh Pattern", "Pattern Position", "Mesh pattern konumu.", "kernel"),
  t("partial-pattern-orientation", "Parsiyel", "Mesh Pattern", "Pattern Orientation", "Mesh pattern yönü.", "kernel"),
  t("clasp-single-curve", "Parsiyel", "Clasp", "Single Curve Clasp", "Tek curve clasp tipi.", "kernel"),
  t("clasp-dual-curve", "Parsiyel", "Clasp", "Dual Curve Clasp", "Çift curve clasp tipi.", "kernel"),
  t("clasp-dual-j", "Parsiyel", "Clasp", "Dual Curve J Clasp", "J tipi çift curve clasp.", "kernel"),
  t("clasp-dual-t", "Parsiyel", "Clasp", "Dual Curve T Clasp", "T tipi çift curve clasp.", "kernel"),
  t("clasp-triple-t", "Parsiyel", "Clasp", "Triple Curve T Clasp", "Üç curve T clasp.", "kernel"),

  // Full denture detailed placement
  t("denture-library-select", "Tam Protez", "Library", "Tooth Library Selection", "Protez diş seti seçimi.", "roadmap"),
  t("denture-auto-select", "Tam Protez", "Library", "Auto Select", "Ark ölçülerine göre diş seti önerisi.", "roadmap"),
  t("denture-presets", "Tam Protez", "Library", "Setup Presets", "Kişiselleştirilmiş tooth setup presetleri.", "roadmap"),
  t("denture-simple-move", "Tam Protez", "Placement", "Move", "Protez dişini taşı.", "kernel"),
  t("denture-simple-rotate", "Tam Protez", "Placement", "Rotate", "Protez dişini döndür.", "kernel"),
  t("denture-simple-scale", "Tam Protez", "Placement", "Scale", "Protez dişini ölçeklendir.", "kernel"),
  t("denture-directional", "Tam Protez", "Placement", "Directional Movement", "Yön kısıtlı diş hareketi.", "kernel"),
  t("denture-upper-lower", "Tam Protez", "Chain", "Upper / Lower Separate", "Üst ve alt diş zincirlerini ayrı düzenle.", "kernel"),
  t("denture-anterior-solve", "Tam Protez", "Chain", "Solve Anterior Intersections", "Anterior çakışmaları otomatik çözme.", "kernel"),
  t("single-arch-denture", "Tam Protez", "Denture", "Single Arch Denture", "Tek çene protez workflow'u.", "kernel"),
  t("ivotion-workflow", "Tam Protez", "Manufacturing", "Ivotion-style Disc Workflow", "Monolitik/çok bileşenli denture disk üretim iş akışı için bağımsız DentAYA desteği.", "roadmap"),
  t("denture-tooth-library", "Tam Protez", "Library", "Denture Tooth Library", "Kontak/oklüzyon meta verili protez diş kütüphanesi.", "roadmap"),

  // Model Creator detailed die/model controls
  t("die-key-pin-height", "Model", "Die Parameters", "Key Pin Height", "Removable die pin yüksekliği.", "kernel"),
  t("die-margin-extrusion", "Model", "Die Parameters", "Margin Extrusion", "Die marjin ekstrüzyonu.", "kernel"),
  t("die-seating-width", "Model", "Die Parameters", "Die Seating Width", "Die oturma yüzeyi genişliği.", "kernel"),
  t("die-taper", "Model", "Die Parameters", "Die Taper", "Die taper açısı/formu.", "kernel"),
  t("die-taper-limit", "Model", "Die Parameters", "Taper Height Limit", "Taper yüksekliği limiti.", "kernel"),
  t("die-exclude-pins", "Model", "Die Parameters", "Exclude Pins", "Seçili die'larda pin hariç tutma.", "kernel"),
  t("die-concavity", "Model", "Die Parameters", "Concavity", "Die alt yüzey concavity kontrolü.", "kernel"),
  t("die-parallel-bottom", "Model", "Die Parameters", "Parallelize Die Bottom", "Die altlarını paralelleştirme.", "kernel"),
  t("die-uniform-axis", "Model", "Die Parameters", "Uniform Insertion Direction", "Die'larda ortak giriş ekseni.", "kernel"),
  t("die-horizontal-spacing", "Model", "Die Parameters", "Horizontal Die Spacing", "Die arası yatay boşluk.", "kernel"),
  t("die-pin-grooves", "Model", "Die Parameters", "Pin Grooves", "Pin kanal geometrisi.", "kernel"),
  t("die-pin-groove-size", "Model", "Die Parameters", "Pin Groove Width / Depth", "Pin kanal genişliği ve derinliği.", "kernel"),
  t("model-min-cavity", "Model", "Model Body", "Minimum Cavity Size", "Hollow model minimum cavity kontrolü.", "kernel"),
  t("model-milling-diameter", "Model", "Model Body", "Milling Diameter", "Model milling compensation takım çapı.", "kernel"),
  t("implant-model-gingiva", "Model", "Implant Model", "Gingiva Mask", "İmplant modelde gingiva maskesi.", "kernel"),
  t("implant-model-abutment-die", "Model", "Implant Model", "Abutment Die", "İmplant modelde çıkarılabilir abutment die.", "kernel"),
  t("implant-model-preconditioned", "Model", "Implant Model", "Preconditioned", "Önceden koşullandırılmış implant model yolu.", "kernel"),
  t("implant-model-unconditioned", "Model", "Implant Model", "Unconditioned", "Koşullandırılmamış implant model yolu.", "kernel"),
  t("implant-model-abutment-gingiva", "Model", "Implant Model", "Abutment / Gingiva", "Abutment ve gingiva kombine model seçeneği.", "kernel"),
  t("implant-analog-offset", "Model", "Implant Model", "Analog Horizontal Offset", "Analog yatay offset kontrolü.", "kernel"),
  t("model-attachments", "Model", "Model Creator", "Model Attachments", "Model üzerine üretim attachment/etiket geometrisi.", "kernel"),
  t("articulator-print-interface", "Model", "Model Creator", "Print-and-Click Articulator Interface", "Baskı sonrası mekanik articulator bağlantı arayüzü.", "kernel"),
  t("xsnap-style-articulator", "Model", "Model Creator", "Printable Articulator Geometry", "Üst-alt modeli baskı articulator geometrisiyle ilişkilendirme.", "kernel"),

  // Virtual articulator / patient motion detailed
  t("articulator-type", "Hareket", "Articulator", "Articulator Type", "Sanal articulator modelini seç.", "roadmap"),
  t("rearticulate", "Hareket", "Articulator", "Rearticulate Models Virtually", "Modelleri sanal olarak yeniden artiküle et.", "kernel"),
  t("influence-teeth", "Hareket", "Articulator", "Teeth Influence Selection", "Hareketi etkileyen dişleri seç.", "kernel"),
  t("bite-fork-align", "Hareket", "Patient Motion", "Bite Fork Alignment", "Bite fork taramasını hareket verisine hizala.", "kernel"),

  // DICOM
  t("dicom-viewer", "DICOM", "Viewer", "DICOM Viewer", "CBCT/CT voxel verisini CAD yüzeyleriyle birlikte görüntüleme; tanı amacı taşımaz.", "roadmap"),
  t("dicom-registration", "DICOM", "Viewer", "DICOM / Surface Registration", "Voxel ve surface scan hizalama.", "kernel"),

  // Smile details
  t("smile-tooth-position", "Smile", "Smile Design", "Tooth Positioning", "2D/3D yüz referansına göre diş konumlandırma.", "roadmap"),
  t("smile-mirror", "Smile", "Smile Design", "Mirror Movements", "Sağ/sol estetik hareketleri aynalama.", "roadmap"),
  t("smile-multiselect", "Smile", "Smile Design", "Single / Multi Tooth Selection", "Tek veya çoklu diş düzenleme seçimi.", "roadmap"),
  t("auto-photo-align", "Smile", "Automation", "Automatic Jaw / Photo Alignment", "3D çene ile fotoğrafı otomatik hizalama.", "roadmap"),
  t("trusmile-photo", "Smile", "Visualization", "Photoreal Photo Preview", "Fotoğraf üzerinde fotogerçekçi tasarım önizlemesi.", "roadmap"),
  t("tooth-color-presets", "Smile", "Visualization", "Tooth Color Presets", "Sunum görünümü için diş renk presetleri.", "roadmap"),

  // AI design detail
  t("ai-style-auto", "AI", "Design Assist", "Auto Detect Style", "Anatomi önerisi stilini bağlama göre seçme.", "roadmap"),
  t("ai-style-adjacent", "AI", "Design Assist", "Adjacent / Contralateral Style", "Komşu veya kontralateral anatomiden stil önerisi.", "roadmap"),
  t("ai-style-library", "AI", "Design Assist", "Library Style", "Diş kütüphanesi temelli AI tasarım stili.", "roadmap"),
  t("ai-multi-unit", "AI", "Design Assist", "Multi-unit Design", "Bitişik çoklu ünite için tasarım önerisi.", "roadmap"),

  // Nesting / manufacturing detail
  t("incad-nesting", "Üretim", "Nesting", "In-CAD Nesting", "Tek veya çoklu restorasyonu üretim blank'ına yerleştirme.", "roadmap"),
  t("milling-block-position", "Üretim", "Nesting", "Milling Block Position", "Restorasyonun milling block içindeki pozisyonu.", "roadmap"),
  t("manufacturing-metadata", "Üretim", "Nesting", "Manufacturing Metadata", "Üretim bilgilerini CAM katmanına aktarma.", "roadmap"),

  // Telescopic detail
  t("telescope-control-points", "İleri Restorasyon", "Telescopic", "Control Points", "Teleskop geometrisini kontrol noktalarıyla düzenleme.", "kernel"),
  t("telescope-full-anatomy", "İleri Restorasyon", "Telescopic", "Full Anatomy Segment", "Teleskop segmentinde tam anatomi davranışı.", "kernel"),
  t("telescope-diameter", "İleri Restorasyon", "Telescopic", "Diameter", "Teleskop çap kontrolü.", "kernel"),
  t("telescope-mesial-angle", "İleri Restorasyon", "Telescopic", "Mesial Angle", "Mezial teleskop yüzey açısı.", "kernel"),
  t("telescope-buccal-angle", "İleri Restorasyon", "Telescopic", "Buccal Angle", "Bukkal teleskop yüzey açısı.", "kernel"),
  t("telescope-distal-angle", "İleri Restorasyon", "Telescopic", "Distal Angle", "Distal teleskop yüzey açısı.", "kernel"),
  t("telescope-lingual-angle", "İleri Restorasyon", "Telescopic", "Lingual Angle", "Lingual teleskop yüzey açısı.", "kernel"),
  t("telescope-axis", "İleri Restorasyon", "Telescopic", "Insertion Axis", "Teleskop giriş ekseni.", "kernel"),

  // Post & Core detail
  t("post-scanbody-inner-margin", "İleri Restorasyon", "Post & Core", "Scan / Inner Margin", "Kanal içi scan ve margin başlangıcı.", "kernel"),
  t("post-tooth-model", "İleri Restorasyon", "Post & Core", "Tooth Model", "Post-core üst restorasyon diş modeli.", "kernel"),
  t("core-min-angle", "İleri Restorasyon", "Post & Core", "Minimum Angle", "Core minimum açı kontrolü.", "kernel"),
  t("core-spacing", "İleri Restorasyon", "Post & Core", "Spacing", "Core-restorasyon spacing kontrolü.", "kernel"),
  t("core-occlusal-adapt", "İleri Restorasyon", "Post & Core", "Occlusal Adaptation", "Core oklüzal adaptasyonu.", "kernel"),

  // Pre-op / copy / mirror
  t("preop-reference", "Anatomi", "Pre-op", "Pre-op Reference", "Mevcut doğal anatomiyi referans olarak kullan.", "roadmap"),
  t("preop-auto-adapt", "Anatomi", "Pre-op", "Auto Adapt to Pre-op", "Model anatomisini pre-op taramaya adapte et.", "kernel"),
  t("contralateral-reference", "Anatomi", "Pre-op", "Contralateral Reference", "Karşı taraftaki doğal dişi referans al.", "kernel"),

  // Save / export details
  t("save-scene-as", "Dosya", "Save / Export", "Save Scene As", "Proje sahnesini yeni versiyon/isimle kaydet.", "roadmap"),
  t("export-scene-mesh", "Dosya", "Save / Export", "Export Scene to Mesh", "Görünür CAD objelerini tek mesh çıktısına dönüştür.", "kernel"),
  t("case-upload", "Dosya", "Collaboration", "Case Upload", "Vaka verisini güvenli paylaşım katmanına yükleme.", "roadmap"),

  // Cloud services / segmentation
  t("cloud-multi-segmentation", "AI", "Cloud", "Multi-tooth Segmentation", "Çoklu diş segmentasyon servisi.", "roadmap"),
  t("cloud-splint-segmentation", "AI", "Cloud", "Splint Segmentation", "Splint akışı için otomatik diş segmentasyonu.", "roadmap"),
  t("cloud-smile-automation", "AI", "Cloud", "Smile Automation", "Fotoğraf/yüz referansı otomasyon servisleri.", "roadmap"),
  t("cloud-case-communication", "AI", "Cloud", "Cloud Case Communication", "Vaka bağlamlı bulut iletişim/yardım servisi.", "roadmap"),

];

export const DENTAYA_CAD_TOOL_CATEGORIES = Array.from(
  new Set(DENTAYA_CAD_TOOL_MATRIX.map((item) => item.category)),
);

export function cadAvailabilityLabel(value: CadToolAvailability) {
  if (value === "live") return "AKTİF";
  if (value === "preview") return "TEKNİK ÖNİZLEME";
  if (value === "kernel") return "GEOMETRİ ÇEKİRDEĞİ";
  return "YOL HARİTASI";
}
