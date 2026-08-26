/**
 * 연화재실 실제 상품 이미지 데이터
 * C:\ai_web\lecture1\3차과제중\img\상품 폴더를 직접 스캔하여 작성했습니다.
 * 존재하지 않는 이미지 파일은 절대 포함하지 않습니다. (임의 생성 금지 규칙 준수)
 *
 * 참고 : 정식 서비스에서는 이 데이터가 Supabase(products / product_images / product_variants)에서
 * 조회되어야 합니다. 현재는 supabase MCP 인증(OAuth)이 완료되지 않아 DB가 아직 없으므로,
 * 우선 로컬 이미지 기반 정적 데이터로 사이트를 배포하고, DB 연동은 다음 단계에서 교체합니다.
 */

const IMG_BASE = 'img/상품';

// 사이즈별 재고는 실제 DB가 없어 임의의 판매 재고 수치를 만들지 않습니다.
// 대신 "재고 정보는 DB 연동 후 표시됩니다" 로 명시적으로 안내합니다.
const STOCK_PENDING = true;

const COLLECTIONS = [
  {
    id: 'seolhwamukbi',
    name: '설화먹비',
    dir: '설화먹비',
    price: 189000,
    hanbokImages: ['설화먹비01.png', '설화먹비02.png', '설화먹비03.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [
      { name: '설화먹비 비녀', file: '설화먹비 악세사리 비녀.png', price: 32000 },
      { name: '설화먹비 노리개', file: '설화먹비 악세사리 노리개.png', price: 24000 },
      { name: '설화먹비 꽃신', file: '설화먹비 악세사리 꽃신.png', price: 28000 },
    ],
    goods: [
      { name: '설화먹비 아크릴 스탠드', file: '아크릴스텐드.png', price: 12000 },
      { name: '설화먹비 복주머니', file: '복주머니 손거울.png', price: 15000 },
      { name: '설화먹비 키링', file: '키링.png', price: 9000 },
      { name: '설화먹비 포토카드', file: '포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'bombitchyeonbunhong',
    name: '봄빛연분홍',
    dir: '봄빛연분홍',
    price: 179000,
    hanbokImages: ['봄빛연분홍01.png', '봄빛연분홍02.png', '봄빛연분홍03.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [],
    goods: [
      { name: '봄빛연분홍 아크릴 스탠드', file: '봄빛연분홍 아크릴 스텐드.png', price: 12000 },
      { name: '봄빛연분홍 복주머니', file: '봄빛연분홍 복주머니.png', price: 15000 },
      { name: '봄빛연분홍 키링', file: '봄빛연분홍 키링.png', price: 9000 },
      { name: '봄빛연분홍 포토카드', file: '봄빛연분홍 포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'mukhwayeonmu',
    name: '묵화연무',
    dir: '묵화연무',
    price: 195000,
    hanbokImages: ['묵화연무01.png', '묵화연무02.png', '묵화연무03.png', '묵화연무04.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [
      { name: '묵화연무 비녀', file: '묵화연무 악세사리 비녀.png', price: 32000 },
      { name: '묵화연무 노리개', file: '묵화연무 악세사리 노리개.png', price: 24000 },
      { name: '묵화연무 꽃신', file: '묵화연무 악세사리 꽃신.png', price: 28000 },
    ],
    goods: [
      { name: '묵화연무 아크릴 스탠드', file: '묵화연무 아크릴 스텐드.png', price: 12000 },
      { name: '묵화연무 복주머니', file: '묵화연무 복주머니.png', price: 15000 },
      { name: '묵화연무 키링', file: '묵화연무 키링.png', price: 9000 },
      { name: '묵화연무 포토카드', file: '묵화연무 포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'meokbitwhayeon',
    name: '먹빛화연',
    dir: '먹빛화연',
    price: 185000,
    hanbokImages: ['먹빛화연01.png', '먹빛화연02.png', '먹빛화연03.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [],
    goods: [
      { name: '먹빛화연 아크릴 스탠드', file: '먹빛화연 아크릴 스텐드.png', price: 12000 },
      { name: '먹빛화연 복주머니', file: '먹빛화연 복주머니.png', price: 15000 },
      { name: '먹빛화연 키링', file: '먹빛화연 키링.png', price: 9000 },
      { name: '먹빛화연 포토카드', file: '먹빛화연 포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'dalbitwhayansobok',
    name: '달빛하얀소복',
    dir: '달빛하얀소복',
    price: 199000,
    hanbokImages: ['하얀달빛소복01.png', '하얀달빛소복02.png', '하얀달빛소복03.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [
      { name: '달빛하얀소복 비녀', file: '하얀달빛소복 악세사리 비녀.png', price: 32000 },
      { name: '달빛하얀소복 노리개', file: '하얀달빛소복 악세사리 노리개.png', price: 24000 },
      { name: '달빛하얀소복 꽃신', file: '하얀달빛소복 악세사리 꽃신.png', price: 28000 },
    ],
    goods: [
      { name: '달빛하얀소복 아크릴 스탠드', file: '하얀달빛소복 아크릴 스텐드.png', price: 12000 },
      { name: '달빛하얀소복 복주머니', file: '하얀달빛소복 복주머니.png', price: 15000 },
      { name: '달빛하얀소복 키링', file: '하얀달빛소복 키링.png', price: 9000 },
      { name: '달빛하얀소복 포토카드', file: '하얀달빛소복 포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'heukcheongwolhwa',
    name: '흑청월화',
    dir: '흑청월화',
    price: 209000,
    hanbokImages: ['흑청월화01.png', '흑청월화02.png', '흑청월화03.png', '흑청월화04.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [],
    goods: [
      { name: '흑청월화 아크릴 스탠드', file: '흑청월화 아크릴스텐드.png', price: 12000 },
      { name: '흑청월화 손가방', file: '흑청월화 손가방.png', price: 18000 },
      { name: '흑청월화 키링', file: '흑청월화 키링.png', price: 9000 },
      { name: '흑청월화 포토카드', file: '흑청월화 포토카드.png', price: 5000 },
    ],
  },
  {
    id: 'hongyeonhwadam',
    name: '홍연화담',
    dir: '홍연화담',
    price: 195000,
    hanbokImages: ['홍연화담01.png', '홍연화담02.png', '홍연화담03.png', '홍연화담04.png'],
    productOnly: '정면.png',
    side: '측면.png',
    accessories: [],
    goods: [
      { name: '홍연화담 아크릴 스탠드', file: '아크릴스텐드.png', price: 12000 },
      { name: '홍연화담 복주머니', file: '복주머니.png', price: 15000 },
      { name: '홍연화담 키링', file: '키링.png', price: 9000 },
      { name: '홍연화담 포토카드', file: '포토카드.png', price: 5000 },
    ],
  },
];

function imgPath(collectionDir, file) {
  return `${IMG_BASE}/${collectionDir}/${file}`;
}

function formatWon(n) {
  return n.toLocaleString('ko-KR') + '원';
}
