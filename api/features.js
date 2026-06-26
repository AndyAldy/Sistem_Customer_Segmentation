// ============================================================
// FEATURE ENGINEERING — terjemahan dari build_features() (Python)
// Input  : array of object hasil parse marketing_campaign.csv (raw, tab-separated)
// Output : array of object dengan kolom final siap disimpan ke Supabase
// ============================================================

/**
 * Tanggal acuan dataset (sama seperti di notebook Python: 4 Okt 2014).
 * Dipakai untuk menghitung 'Seniority' (lama jadi pelanggan, dalam bulan).
 */
const LAST_DATE = new Date(2014, 9, 4); // bulan di JS 0-indexed -> Oktober = 9

const MARITAL_MAP = {
  Divorced: 'Alone',
  Single: 'Alone',
  Married: 'In couple',
  Together: 'In couple',
  Absurd: 'Alone',
  Widow: 'Alone',
  YOLO: 'Alone',
};

const EDUCATION_MAP = {
  Basic: 'Undergraduate',
  '2n Cycle': 'Undergraduate',
  Graduation: 'Postgraduate',
  Master: 'Postgraduate',
  PhD: 'Postgraduate',
};

const CHILDREN_MAP = {
  3: '3 children',
  2: '2 children',
  1: '1 child',
  0: 'No child',
};

/** Parse tanggal format dd-mm-yyyy (format dataset) menjadi objek Date. */
function parseDdMmYyyy(str) {
  const [d, m, y] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * LANGKAH 1 — Cleaning: hapus baris tanpa Income & outlier Income >= 600000.
 * (setara df.dropna(subset=['Income']) + df[df['Income'] < 600000])
 */
function cleanRawData(rows) {
  const before = rows.length;
  const cleaned = rows.filter((r) => {
    const income = Number(r.Income);
    return r.Income !== '' && r.Income !== undefined && !Number.isNaN(income) && income < 600000;
  });
  return { cleaned, before, after: cleaned.length };
}

/**
 * LANGKAH 2 — Feature engineering, setara build_features() di notebook Python.
 * Mengembalikan array of object dengan kolom final:
 * Age, Education, Marital_Status, Income, Spending, Seniority,
 * Has_child, Children, Wines, Fruits, Meat, Fish, Sweets, Gold
 */
function buildFeatures(rows) {
  return rows.map((r) => {
    const income = Number(r.Income) || 0;
    const wines = Number(r.MntWines) || 0;
    const fruits = Number(r.MntFruits) || 0;
    const meat = Number(r.MntMeatProducts) || 0;
    const fish = Number(r.MntFishProducts) || 0;
    const sweets = Number(r.MntSweetProducts) || 0;
    const gold = Number(r.MntGoldProds) || 0;

    const age = 2014 - Number(r.Year_Birth);
    const spending = wines + fruits + meat + fish + sweets + gold;

    const customerSince = parseDdMmYyyy(r.Dt_Customer);
    const diffDays = Math.round((LAST_DATE - customerSince) / (1000 * 60 * 60 * 24));
    const seniority = diffDays / 30;

    const maritalStatus = MARITAL_MAP[r.Marital_Status] ?? r.Marital_Status;
    const education = EDUCATION_MAP[r.Education] ?? r.Education;

    const childrenCount = (Number(r.Kidhome) || 0) + (Number(r.Teenhome) || 0);
    const hasChild = childrenCount > 0 ? 'Has child' : 'No child';
    const children = CHILDREN_MAP[childrenCount] ?? `${childrenCount} children`;

    return {
      Age: age,
      Education: education,
      Marital_Status: maritalStatus,
      Income: income,
      Spending: spending,
      Seniority: Number(seniority.toFixed(4)),
      Has_child: hasChild,
      Children: children,
      Wines: wines,
      Fruits: fruits,
      Meat: meat,
      Fish: fish,
      Sweets: sweets,
      Gold: gold,
    };
  });
}

export { cleanRawData, buildFeatures };
