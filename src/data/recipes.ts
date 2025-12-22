export type Recipe = {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  content: string; // full recipe text
  difficulty: "kolay" | "orta" | "zor";
  durationMinutes: number;
};

export const recipes: Recipe[] = [
  {
    id: 1,
    title: "Zeytinyağlı Enginar",
    slug: "zeytinyagli-enginar",
    shortDescription: "Geleneksel zeytinyağlı enginar yemeği. Taze enginarlarla hazırlanan, sofralarınızın vazgeçilmezi.",
    content: `Malzemeler:
- 8 adet taze enginar
- 2 adet orta boy soğan
- 2 adet havuç
- 1 adet patates
- 1/2 su bardağı zeytinyağı
- 1 su bardağı su
- 1 limon
- 1 çay kaşığı şeker
- Tuz
- Maydanoz

Hazırlanışı:
1. Enginarların dış yapraklarını temizleyin ve kalplerini çıkarın. Limonlu suda bekletin.
2. Soğanları yemeklik doğrayın, havuç ve patatesi küp küp kesin.
3. Geniş bir tencereye zeytinyağını alın, soğanları ekleyip yumuşayana kadar kavurun.
4. Havuç ve patatesi ekleyip 2-3 dakika daha kavurun.
5. Enginar kalplerini ekleyin, üzerine su, limon suyu, şeker ve tuz ekleyin.
6. Kapağını kapatıp orta ateşte yaklaşık 30-35 dakika pişirin.
7. Soğuduktan sonra maydanoz ile süsleyip servis edin.`,
    difficulty: "orta",
    durationMinutes: 45,
  },
  {
    id: 2,
    title: "Enginar Kalpli Makarna",
    slug: "enginar-kalpli-makarna",
    shortDescription: "Lezzetli ve doyurucu enginar kalpli makarna tarifi. Pratik ve nefis bir ana yemek seçeneği.",
    content: `Malzemeler:
- 400 gr makarna (penne veya fusilli)
- 1 kavanoz enginar kalbi konservesi
- 2 diş sarımsak
- 1/2 su bardağı krema
- 1/2 su bardağı rendelenmiş parmesan peyniri
- 2 yemek kaşığı zeytinyağı
- Tuz, karabiber
- Taze fesleğen

Hazırlanışı:
1. Makarnayı tuzlu kaynar suda paket üzerindeki süre kadar haşlayın.
2. Zeytinyağını bir tavada ısıtın, ince doğranmış sarımsağı ekleyip kokusu çıkana kadar kavurun.
3. Enginar kalplerini ekleyip 2-3 dakika soteleyin.
4. Kremayı ekleyip kaynayana kadar pişirin, ardından parmesan peynirini ekleyin.
5. Haşlanmış makarnayı süzüp sosun içine ekleyin, karıştırın.
6. Tuz ve karabiber ile tatlandırın, taze fesleğen ile süsleyip servis edin.`,
    difficulty: "kolay",
    durationMinutes: 25,
  },
  {
    id: 3,
    title: "Fırında Enginar Graten",
    slug: "firinda-enginar-graten",
    shortDescription: "Beşamel soslu enginar graten. Özel günler için ideal, görsel ve lezzet şöleni.",
    content: `Malzemeler:
- 8 adet enginar kalbi
- 2 yemek kaşığı tereyağı
- 2 yemek kaşığı un
- 2 su bardağı süt
- 1/2 su bardağı rendelenmiş kaşar peyniri
- 1/2 su bardağı rendelenmiş parmesan peyniri
- Muskat, tuz, karabiber
- 1 yemek kaşığı zeytinyağı

Hazırlanışı:
1. Enginar kalplerini haşlayıp süzün ve bir fırın kabına dizin.
2. Beşamel sos için: Tereyağını eritin, unu ekleyip 2 dakika kavurun.
3. Sütü yavaş yavaş ekleyip topaklanmaması için sürekli karıştırın.
4. Koyulaşana kadar pişirin, muskat, tuz ve karabiber ekleyin.
5. Kaşar peynirinin yarısını beşamel sosuna ekleyip eritin.
6. Enginarların üzerine beşamel sosunu dökün.
7. Kalan kaşar ve parmesan peynirini üzerine serpin.
8. 200°C fırında 20-25 dakika üzeri kızarana kadar pişirin.`,
    difficulty: "zor",
    durationMinutes: 50,
  },
  {
    id: 4,
    title: "Enginarlı Diyet Salata",
    slug: "enginarli-diyet-salata",
    shortDescription: "Hafif ve besleyici enginarlı salata. Sağlıklı beslenenler için ideal, her öğüne uygun.",
    content: `Malzemeler:
- 1 kavanoz enginar kalbi konservesi
- 1 adet kırmızı soğan
- 1 adet salatalık
- 1 adet domates
- 1/2 demet roka
- 1/2 demet maydanoz
- 1/4 su bardağı zeytinyağı
- 2 yemek kaşığı limon suyu
- 1 çay kaşığı bal
- Tuz, karabiber
- 50 gr beyaz peynir (isteğe bağlı)

Hazırlanışı:
1. Enginar kalplerini süzüp doğrayın.
2. Kırmızı soğanı ince halkalar halinde kesin.
3. Salatalık ve domatesi küp küp doğrayın.
4. Roka ve maydanozu yıkayıp doğrayın.
5. Tüm malzemeleri geniş bir salata kasesinde karıştırın.
6. Sos için: Zeytinyağı, limon suyu, bal, tuz ve karabiberi çırpın.
7. Sosu salatanın üzerine gezdirin, hafifçe karıştırın.
8. İsteğe bağlı olarak üzerine küp küp doğranmış beyaz peynir ekleyin ve servis edin.`,
    difficulty: "kolay",
    durationMinutes: 15,
  },
];

