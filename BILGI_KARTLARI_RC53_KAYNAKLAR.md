# RC53 bilgi kartları — kaynak ve içerik kaydı

Tarih: 21 Ekim 2026.

Paket 500 ayrı Türkçe/İngilizce kısa bilgi kartı içerir. Önceki 220 kayıt korunmuştur; yeni 280 kayıt `dental-221`–`dental-500` kimliklerini kullanır. Kart sayısı, AYA'nın model eğitimi veya akıl yürütme kalitesi ölçümü değildir. 30.000 kayıt yalnız yapısal kapasite sınırıdır; bu sayıda gerçek içerik bulunduğu iddia edilmez.

Yeni kayıtlar elle yazılmış teknik özetlerdir; şablon kombinasyonları veya sayısal değişkenlerle çoğaltılmamıştır. Konular: mesh topolojisi, normaller, yumuşatma/sadeleştirme, nokta bulutları, yüzey yeniden oluşturma, uzaklık sorguları, hizalama, koordinatlar, STL/OBJ/PLY/glTF aktarımı ve görüntüleme. Görüntüleme materyali bilgileri dental üretim materyali tavsiyesi değildir. Algoritma bilgisi, DentAYA'da o algoritmanın uygulanmış olduğu anlamına gelmez.

Yeni kaynakların tamamı gerçekten okunmuş, sabit sürümlü proje belgeleridir:

| Belge ailesi | Belge sayısı | Yeni kart | Kaynak sürümü |
| --- | ---: | ---: | --- |
| Open3D öğreticileri | 9 | 140 | [v0.19.0](https://github.com/isl-org/Open3D/tree/v0.19.0/docs/jupyter) |
| Three.js API ve aktarım belgeleri | 23 | 140 | [r186](https://github.com/mrdoob/three.js/tree/r186/docs/pages) |

Open3D belgeleri: mesh, pointcloud, surface_reconstruction, distance_queries, kdtree, icp_registration, global_registration, colored_pointcloud_registration ve transformation. Three.js belgeleri: BufferGeometry, BufferAttribute, Vector3, Box3, Triangle, Plane, Ray, Matrix4, STLExporter, STLLoader, OBJLoader, OBJExporter, PLYLoader, GLTFExporter, GLTFLoader, PerspectiveCamera, OrthographicCamera, Raycaster, Object3D, Material, MeshStandardMaterial, Texture ve Color.

Her yeni kaydın `evidence.url` alanı ilgili sürümün gerçek belgesini, `evidence.excerpt` alanı belgeden alınan destekleyici pasajı belirtir. Türkçe ve İngilizce kart metinleri özgün özetlerdir; matematiksel sonuçlar ve uygulama çıkarımları kaynak pasajındaki kavramlardan türetilmiştir. Kaynakların atıf ve MIT yeniden kullanım bilgileri JSON'da, telif bildirimleri aşağıdadır. Toplam kaynak sayısı, korunmuş 28 kaynakla birlikte 60'tır.

Yeni teknik belgeler GitHub raw üzerinden 21 Ekim 2026'da okunmuştur. Three.js r186 ve Open3D v0.19.0 lisans metinlerine de erişilmiştir. Bu çalışma önceki 220 klinik kartın bağımsız klinik incelemesi değildir; `clinicalReviewStatus: not-recorded` korunur.

`verify-dental-facts` tüm 500 kaydın kimlik, iki dil, tek cümle, uzunluk, normalize tekrar ve kaynak bağlantısını denetler. Yeni 280 kayıtta pasaj/atıf/lisans zorunludur; kaynak sürümleri ve pasajın ilgili belgeye bağlılığı ayrıca sınanır. Önceki 220 kayıt hash ile korunur. İçe aktarımda eski kayıtla çakışma ve 30.000 kapasite sınırı testleri sentetik veriyle ayrı yürütülür. `verify-loading-play` 500 kartlık döngüde tekrarsız seçimi ve dil fallback davranışını sınar.

## Three.js belge alıntıları — MIT

The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Kaynak: https://github.com/mrdoob/three.js/blob/r186/LICENSE

## Open3D belge alıntıları — MIT

The MIT License (MIT)

Open3D: www.open3d.org

Copyright (c) 2018-2023 www.open3d.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Kaynak: https://github.com/isl-org/Open3D/blob/v0.19.0/LICENSE
