// ============================================================
// CLUSTERING — terjemahan dari Cell 4 (find_best_k), Cell 5 (run_kmeans),
// dan Cell 8 (generate_business_insights) di notebook Python.
// Menggantikan node-kmeans dengan ml-kmeans agar bisa menghitung
// inertia (WCSS) dan label cluster yang dibutuhkan elbow + silhouette.
// ============================================================
import { kmeans as mlKmeans } from 'ml-kmeans';

/** Fitur numerik yang dipakai untuk clustering (setara X_scaled di notebook). */
const CLUSTER_FEATURES = ['Age', 'Income', 'Spending', 'Seniority', 'Wines', 'Fruits', 'Meat', 'Fish', 'Sweets', 'Gold'];

/**
 * StandardScaler versi JS: (x - mean) / std, per kolom.
 * Setara sklearn.preprocessing.StandardScaler.
 */
function standardScale(data, featureKeys = CLUSTER_FEATURES) {
  const n = data.length;
  const means = {};
  const stds = {};

  featureKeys.forEach((key) => {
    const values = data.map((row) => row[key]);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    means[key] = mean;
    stds[key] = Math.sqrt(variance) || 1; // hindari pembagian dengan 0
  });

  const scaled = data.map((row) => featureKeys.map((key) => (row[key] - means[key]) / stds[key]));

  return { scaled, means, stds, featureKeys };
}

/** Jarak Euclidean kuadrat antar dua vektor. */
function squaredDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return sum;
}

/**
 * Jalankan KMeans dan kembalikan { labels, centroids, inertia }.
 * `inertia` = WCSS (Within-Cluster Sum of Squares), setara km.inertia_ di sklearn.
 */
function runKMeansRaw(X, k, { seed = 42, maxIterations = 500 } = {}) {
  const result = mlKmeans(X, k, { seed, maxIterations, initialization: 'kmeans++' });
  const { clusters: labels, centroids } = result;

  let inertia = 0;
  for (let i = 0; i < X.length; i++) {
    inertia += squaredDistance(X[i], centroids[labels[i]].centroid ?? centroids[labels[i]]);
  }

  return { labels, centroids, inertia };
}

/**
 * Silhouette Score — setara sklearn.metrics.silhouette_score.
 * Dihitung manual karena ml-kmeans tidak menyediakannya.
 * Catatan: kompleksitas O(n^2); untuk dataset >5000 baris sebaiknya disampel.
 */
function silhouetteScore(X, labels) {
  const n = X.length;
  if (n === 0) return 0;

  const distMatrix = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.sqrt(squaredDistance(X[i], X[j]));
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
    }
  }

  const clusterIndices = {};
  labels.forEach((label, idx) => {
    if (!clusterIndices[label]) clusterIndices[label] = [];
    clusterIndices[label].push(idx);
  });

  let totalScore = 0;
  for (let i = 0; i < n; i++) {
    const ownCluster = labels[i];
    const sameCluster = clusterIndices[ownCluster].filter((idx) => idx !== i);

    // a(i): rata-rata jarak ke titik lain dalam cluster yang sama
    const a = sameCluster.length
      ? sameCluster.reduce((sum, idx) => sum + distMatrix[i][idx], 0) / sameCluster.length
      : 0;

    // b(i): rata-rata jarak terkecil ke cluster lain
    let b = Infinity;
    Object.keys(clusterIndices).forEach((clusterId) => {
      if (Number(clusterId) === ownCluster) return;
      const members = clusterIndices[clusterId];
      const avgDist = members.reduce((sum, idx) => sum + distMatrix[i][idx], 0) / members.length;
      if (avgDist < b) b = avgDist;
    });

    const s = sameCluster.length === 0 ? 0 : (b - a) / Math.max(a, b);
    totalScore += s;
  }

  return totalScore / n;
}

/**
 * Metode Kneedle — titik dengan jarak tegak lurus terjauh dari garis lurus
 * yang menghubungkan titik pertama & terakhir kurva WCSS.
 * Terjemahan langsung dari find_elbow() di notebook Python.
 */
function findElbow(ks, ys) {
  const xMin = Math.min(...ks);
  const xMax = Math.max(...ks);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xNorm = ks.map((x) => (x - xMin) / (xMax - xMin));
  const yNorm = ys.map((y) => (y - yMin) / (yMax - yMin));

  const p1 = [xNorm[0], yNorm[0]];
  const p2 = [xNorm[xNorm.length - 1], yNorm[yNorm.length - 1]];
  const lineVec = [p2[0] - p1[0], p2[1] - p1[1]];
  const lineLen = Math.sqrt(lineVec[0] ** 2 + lineVec[1] ** 2);
  const lineVecNorm = [lineVec[0] / lineLen, lineVec[1] / lineLen];

  let maxDist = -Infinity;
  let bestIdx = 0;

  for (let i = 0; i < xNorm.length; i++) {
    const p = [xNorm[i], yNorm[i]];
    const diff = [p[0] - p1[0], p[1] - p1[1]];
    const projLen = diff[0] * lineVecNorm[0] + diff[1] * lineVecNorm[1];
    const projPoint = [p1[0] + projLen * lineVecNorm[0], p1[1] + projLen * lineVecNorm[1]];
    const dist = Math.sqrt((p[0] - projPoint[0]) ** 2 + (p[1] - projPoint[1]) ** 2);

    if (dist > maxDist) {
      maxDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * LANGKAH 4 — Cari K terbaik (Elbow Method sebagai penentu utama,
 * Silhouette Score dihitung & dilaporkan sebagai metrik pendukung).
 * Setara find_best_k() di notebook Python.
 */
function findBestK(X, kRange = [2, 3, 4, 5, 6, 7, 8]) {
  const wcssList = [];
  const silList = [];

  kRange.forEach((k) => {
    const { labels, inertia } = runKMeansRaw(X, k);
    wcssList.push(inertia);
    silList.push(silhouetteScore(X, labels));
  });

  const elbowIdx = findElbow(kRange, wcssList);
  const elbowK = kRange[elbowIdx];

  let silhouetteK = kRange[0];
  let maxSil = -Infinity;
  silList.forEach((s, i) => {
    if (s > maxSil) {
      maxSil = s;
      silhouetteK = kRange[i];
    }
  });

  const bestK = elbowK; // Elbow sebagai patokan utama (sama seperti notebook)

  return {
    bestK,
    chartData: {
      k_values: kRange,
      wcss: wcssList,
      silhouette: silList,
      elbow_k: elbowK,
      silhouette_k: silhouetteK,
      best_k: bestK,
    },
  };
}

/**
 * LANGKAH 5 — Jalankan K-Means final dengan K terbaik.
 * Setara run_kmeans() di notebook Python.
 */
function runFinalKMeans(X, k) {
  const { labels, inertia } = runKMeansRaw(X, k);
  const silScore = silhouetteScore(X, labels);
  return { labels, inertia, silhouetteScore: silScore };
}

/**
 * LANGKAH 6c — Hitung profil rata-rata tiap cluster & insight bisnis otomatis.
 * Setara generate_business_insights() di notebook Python.
 */
function generateBusinessInsights(featureRows, labels, k, silScore) {
  const avgIncome = average(featureRows.map((r) => r.Income));
  const avgSpending = average(featureRows.map((r) => r.Spending));
  const avgSeniority = average(featureRows.map((r) => r.Seniority));

  const insights = { silhouette_score: silScore, k_used: k, clusters: {} };

  for (let cl = 0; cl < k; cl++) {
    const members = featureRows.filter((_, idx) => labels[idx] === cl);
    const jumlah = members.length;
    const persen = (jumlah / featureRows.length) * 100;

    const rataIncome = average(members.map((m) => m.Income));
    const rataSpending = average(members.map((m) => m.Spending));
    const rataSeniority = average(members.map((m) => m.Seniority));
    const rataAge = average(members.map((m) => m.Age));

    const incomeLevel = rataIncome > avgIncome ? 'tinggi' : 'rendah';
    const spendingLevel = rataSpending > avgSpending ? 'tinggi' : 'rendah';
    const seniorityLevel = rataSeniority > avgSeniority ? 'lama' : 'baru';

    let strategy;
    if (incomeLevel === 'tinggi' && spendingLevel === 'tinggi') {
      strategy = 'Pelanggan bernilai tinggi — tawarkan program loyalitas & produk premium.';
    } else if (incomeLevel === 'tinggi' && spendingLevel === 'rendah') {
      strategy = 'Income tinggi tapi belanja rendah — berpotensi besar, perlu kampanye personalisasi.';
    } else if (incomeLevel === 'rendah' && spendingLevel === 'tinggi') {
      strategy = 'Belanja tinggi relatif income — pelanggan loyal, pertahankan dengan promo eksklusif.';
    } else {
      strategy = 'Income & belanja rendah — pertimbangkan penawaran entry-level atau diskon untuk reaktivasi.';
    }

    insights.clusters[`Cluster ${cl}`] = {
      jumlah_pelanggan: jumlah,
      persen: Number(persen.toFixed(1)),
      rata_income: Number(rataIncome.toFixed(1)),
      rata_spending: Number(rataSpending.toFixed(1)),
      rata_seniority: Number(rataSeniority.toFixed(1)),
      rata_age: Number(rataAge.toFixed(1)),
      income_level: incomeLevel,
      spending_level: spendingLevel,
      seniority_level: seniorityLevel,
      strategi: strategy,
    };
  }

  return insights;
}

function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export {
  CLUSTER_FEATURES,
  standardScale,
  findBestK,
  runFinalKMeans,
  generateBusinessInsights,
  silhouetteScore,
};
