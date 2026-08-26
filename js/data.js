/**
 * 연화재실 상품 데이터 로더
 * Supabase(products / product_images / product_variants / collections)에서
 * 공개 상태(status='public') 상품을 조회하여 기존 화면 렌더링 코드가 기대하는
 * COLLECTIONS 구조로 재구성합니다.
 *
 * COLLECTIONS 항목 구조 (기존 필드는 그대로 유지 + 장바구니/주문/상세페이지 연동용 필드 추가):
 * {
 *   id, name, dir, price, productId, slug, variants: {S:{id,stock}, M:{...}, L:{...}},
 *   hanbokImages: [file,...], productOnly: file, side: file,
 *   accessories: [{ name, file, price, productId, slug, variantId, stock }],
 *   goods: [{ name, file, price, productId, slug, variantId, stock }],
 * }
 */

const IMG_BASE = 'img/상품';

function imgPath(collectionDir, file) {
  const path = `${IMG_BASE}/${collectionDir}/${file}`;
  const isMukhwaCardImage = collectionDir === '묵화연무' && /^묵화연무0[1-4]\.png$/.test(file);
  return isMukhwaCardImage ? `${path}?v=20260826-card-fit` : path;
}

// formatWon()은 js/shop-common.js에서 전역으로 제공됩니다 (중복 정의 금지).

// 다른 스크립트(app.js)가 채워질 때까지 기다릴 수 있도록 빈 배열로 시작합니다.
let COLLECTIONS = [];

function extractDirAndFile(imageUrl) {
  // 저장 형태: img/상품/<dir>/<file>
  const parts = (imageUrl || '').split('/');
  return { dir: parts[2] || '', file: parts.slice(3).join('/') || '' };
}

async function fetchProductsFromSupabase() {
  const { data, error } = await window.supabaseClient
    .from('products')
    .select(`
      id, name, slug, product_type, sale_price, sort_order, collection_id,
      collections ( id, name, slug, sort_order ),
      product_images ( image_url, image_type, sort_order, is_primary ),
      product_variants ( id, size, stock_quantity, low_stock_threshold )
    `)
    .eq('status', 'public')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('상품 데이터를 불러오지 못했습니다:', error.message);
    return [];
  }
  return data || [];
}

function buildCollectionsFromProducts(products) {
  const byCollection = new Map();

  products.forEach(p => {
    const col = p.collections;
    if (!col) return;
    if (!byCollection.has(col.id)) {
      byCollection.set(col.id, {
        id: col.slug,
        name: col.name,
        sortOrder: col.sort_order,
        dir: '',
        price: 0,
        productId: null,
        slug: '',
        variants: {},
        hanbokImages: [],
        productOnly: '',
        side: '',
        accessories: [],
        goods: [],
      });
    }
    const entry = byCollection.get(col.id);
    const images = (p.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const primaryImage = images.find(i => i.is_primary) || images[0];
    const { dir } = primaryImage ? extractDirAndFile(primaryImage.image_url) : { dir: '' };
    if (dir) entry.dir = dir;

    if (p.product_type === 'hanbok') {
      entry.price = p.sale_price;
      entry.productId = p.id;
      entry.slug = p.slug;
      entry.hanbokImages = images.filter(i => i.image_type === 'main').map(i => extractDirAndFile(i.image_url).file);
      const front = images.find(i => i.image_type === 'product_only' && i.sort_order === 100);
      const side = images.find(i => i.image_type === 'product_only' && i.sort_order === 101);
      entry.productOnly = front ? extractDirAndFile(front.image_url).file : (entry.hanbokImages[0] || '');
      entry.side = side ? extractDirAndFile(side.image_url).file : entry.productOnly;
      (p.product_variants || []).forEach(v => {
        entry.variants[v.size] = { id: v.id, stock: v.stock_quantity, lowStockThreshold: v.low_stock_threshold };
      });
    } else {
      const file = primaryImage ? extractDirAndFile(primaryImage.image_url).file : '';
      const variant = (p.product_variants || [])[0];
      const item = {
        name: p.name,
        file,
        price: p.sale_price,
        productId: p.id,
        slug: p.slug,
        variantId: variant ? variant.id : null,
        stock: variant ? variant.stock_quantity : 0,
      };
      if (p.product_type === 'accessory') entry.accessories.push(item);
      else entry.goods.push(item);
    }
  });

  return Array.from(byCollection.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

window.COLLECTIONS_READY = (async function loadCollections() {
  try {
    const products = await fetchProductsFromSupabase();
    COLLECTIONS = buildCollectionsFromProducts(products);
  } catch (e) {
    console.error('COLLECTIONS 로드 실패:', e);
    COLLECTIONS = [];
  }
  return COLLECTIONS;
})();
