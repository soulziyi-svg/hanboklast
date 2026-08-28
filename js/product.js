/**
 * 연화재실 상품 상세페이지(product.html)
 * ?slug= 파라미터로 Supabase에서 상품 전체 정보를 조회해 렌더링합니다.
 * 장바구니/로그인 관련 공통 로직은 js/shop-common.js를 그대로 사용합니다.
 */
(async function () {
  'use strict';

  const supabaseClient = window.supabaseClient;
  const { $, $all, showToast, openModal, addToCart, renderCartModal, prefillOrderForm, getCurrentSession, wireCartUI, wireAuthUI, applyAuthUI, formatWon } = window.ShopCommon;

  const PRODUCT_TYPE_LABEL = { hanbok: '한복', accessory: '액세서리', goods: '굿즈' };

  // "moon-*" 상세페이지 레이아웃(갤러리+구매영역 2단, 에디토리얼 섹션)을 쓰는 상품별 콘텐츠 설정입니다.
  // 새 상품을 이 레이아웃으로 추가하려면 아래에 slug를 키로 하는 설정을 하나 더 추가하면 됩니다.
  const MOON_PRODUCTS = {
    'dalbitwhayansobok-hanbok': {
      base: 'img/상품/달빛하얀소복',
      galleryFiles: ['하얀달빛소복01.png', '하얀달빛소복02.png', '하얀달빛소복03.png', '정면.png', '측면.png', '하얀달빛소복 악세사리 비녀.png', '하얀달빛소복 악세사리 노리개.png', '하얀달빛소복 악세사리 꽃신.png'],
      collectionLabel: 'YEONHWAJAESIL · DALBIT COLLECTION',
      storyTitle: '달빛 아래,<br>가장 순수한 순간',
      storyDesc: '설백색 위로 먹빛 산수가 은은하게 번지는 한 벌.<br>전통의 고요한 선을 오늘의 움직임에 맞게 담았습니다.',
      storyImage: '하얀달빛소복01.png', storyImageAlt: '벚꽃 아래 달빛하얀소복을 착용한 모습',
      whyLabel: 'WHY DALBIT', whyTitle: '달빛하얀소복을 선택하는<br>세 가지 이유',
      reasons: [
        { title: '그림처럼 이어지는 산수화', desc: '치맛단 전체에 번지는 먹빛의 농담이 어느 각도에서도 깊은 인상을 남깁니다.' },
        { title: '빛을 머금은 겹과 결', desc: '투명하고 가벼운 겹이 움직임에 따라 부드러운 윤곽과 은은한 광택을 만듭니다.' },
        { title: '전통과 일상을 잇는 균형', desc: '단정한 깃과 편안한 실루엣으로 촬영과 행사 내내 자연스럽게 입을 수 있습니다.' },
      ],
      editorial: [
        { image: '하얀달빛소복02.png', alt: '달빛하얀소복 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>선명한 존재감' },
        { image: '하얀달빛소복03.png', alt: '달빛하얀소복 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 피어나는<br>고요한 먹빛', reverse: true },
      ],
      designTitle: '한복의 선을 지키고<br>입는 순간은 더 편안하게',
      designDesc: '단아하게 여민 깃, 자연스럽게 모이는 허리선, 풍성하게 떨어지는 치마의 비율을 세심하게 조율했습니다. 설백색의 투명한 겉감과 먹빛 산수 표현이 겹치며 깊이를 만듭니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '단정한 여밈', desc: '목선을 부드럽게 감싸는 깃과 안정적인 허리 매듭' },
        { title: '먹빛 산수 표현', desc: '치맛단을 따라 이어지는 섬세한 농담과 꽃 디테일' },
        { title: '풍성한 실루엣', desc: '몸의 움직임을 따라 자연스럽게 퍼지는 여유로운 치마폭' },
      ],
      closeups: [
        { image: '하얀달빛소복02.png', alt: '달빛하얀소복 깃과 허리선 디테일', title: '단정한 깃과 허리선', desc: '겹쳐지는 선과 매듭의 균형을 확인해 주세요.' },
        { image: '정면.png', alt: '달빛하얀소복 치맛단 산수화 디테일', title: '먹빛 산수화 치맛단', desc: '설백색 위로 번지는 먹빛의 농담을 담았습니다.' },
        { image: '측면.png', alt: '달빛하얀소복 소매와 측면 실루엣', title: '가볍게 흐르는 소매', desc: '움직임에 따라 부드럽게 이어지는 실루엣입니다.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '달빛의 차림을<br>완성하는 구성',
      withDesc: '아래 이미지는 함께 선택할 수 있는 추가 상품입니다. 실제 선택 가능 여부와 가격은 상단 구매 영역에서 확인해 주세요.',
      withItems: [
        { image: '하얀달빛소복 악세사리 비녀.png', caption: '비녀' },
        { image: '하얀달빛소복 악세사리 노리개.png', caption: '노리개' },
        { image: '하얀달빛소복 악세사리 꽃신.png', caption: '꽃신 · S 220 / M 230 / L 240' },
      ],
      colorText: '설백색 · 먹색',
      choiceOptions: [
        { image: '하얀달빛소복 악세사리 비녀.png', caption: '비녀' },
        { image: '하얀달빛소복 악세사리 노리개.png', caption: '노리개' },
        { image: '하얀달빛소복 악세사리 꽃신.png', caption: '꽃신' },
      ],
      specImage: '정면.png', specColor: '설백색 · 먹색', specComposition: '저고리 · 치마 · 노리개',
      careSteps: ['전문 드라이클리닝을 권장합니다.', '자수와 얇은 원단이 거친 표면에 닿지 않도록 주의해 주세요.', '착용 후 통풍이 잘되는 그늘에서 충분히 말린 뒤 걸어 보관해 주세요.'],
    },
    'heukcheongwolhwa-hanbok': {
      base: 'img/상품/흑청월화',
      galleryFiles: ['흑청월화01.png', '흑청월화02.png', '흑청월화03.png', '흑청월화04.png', '정면.png', '측면.png'],
      collectionLabel: 'YEONHWAJAESIL · HEUKCHEONGWOLHWA COLLECTION',
      storyTitle: '검푸른 밤하늘 아래,<br>홀로 피어난 달빛',
      storyDesc: '깊은 먹빛과 청화빛이 겹겹이 번지는 치마 위로<br>달빛처럼 은은한 배색이 스며든 한 벌입니다.',
      storyImage: '흑청월화01.png', storyImageAlt: '흑청월화를 착용한 정면 모습',
      whyLabel: 'WHY HEUKCHEONGWOLHWA', whyTitle: '흑청월화를 선택하는<br>세 가지 이유',
      reasons: [
        { title: '완성도 높은 올인원 세트', desc: '흑청월화 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.' },
        { title: '선명한 색감과 디테일', desc: '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.' },
        { title: '편안하고 완성도 높은 연출', desc: '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.' },
      ],
      editorial: [
        { image: '흑청월화02.png', alt: '흑청월화 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>선명한 존재감' },
        { image: '흑청월화03.png', alt: '흑청월화 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 피어나는<br>깊은 청화빛', reverse: true },
      ],
      designTitle: '한복의 선을 지키고<br>배색은 더 선명하게',
      designDesc: '검푸른 청화빛과 깊은 먹빛이 층을 이루며 만들어내는 짙은 색의 깊이. 단정한 저고리 여밈과 허리끈의 디테일이 사진 속에서도 또렷하게 살아납니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '단정한 저고리 여밈', desc: '깊은 색감 위로 이어지는 안정적인 목선과 매듭' },
        { title: '흐르는 치마결', desc: '속치마와 겹쳐 움직임마다 살아나는 풍성한 실루엣' },
        { title: '포인트 허리끈', desc: '허리선을 잡아주며 전체 비율을 정돈하는 디테일' },
      ],
      closeups: [
        { image: '흑청월화02.png', alt: '흑청월화 저고리 깃 디테일', title: '단정한 저고리 깃', desc: '깊은 색감 위로 이어지는 안정적인 목선을 확인해 주세요.' },
        { image: '정면.png', alt: '흑청월화 치맛단 배색 디테일', title: '검푸른 배색 치맛단', desc: '먹빛과 청화빛이 층을 이루는 배색을 담았습니다.' },
        { image: '측면.png', alt: '흑청월화 허리끈과 측면 실루엣', title: '허리끈과 실루엣', desc: '허리선을 잡아주는 포인트 허리끈을 확인해 주세요.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '흑청월화와<br>함께 즐기는 컬렉션',
      withDesc: '아래 이미지는 흑청월화 컬렉션의 별도 굿즈 상품입니다. 가격과 구매는 각 상품 페이지에서 확인해 주세요.',
      withItems: [
        { image: '흑청월화 아크릴스텐드.png', caption: '아크릴 스탠드', slug: 'heukcheongwolhwa-stand' },
        { image: '흑청월화 손가방.png', caption: '손가방', slug: 'heukcheongwolhwa-handbag' },
        { image: '흑청월화 키링.png', caption: '키링', slug: 'heukcheongwolhwa-keyring' },
        { image: '흑청월화 포토카드.png', caption: '포토카드', slug: 'heukcheongwolhwa-photocard' },
      ],
      colorText: '먹빛 · 청화남빛',
      choiceOptions: [],
      specImage: '정면.png', specColor: '먹빛 · 청화남빛', specComposition: '저고리 · 치마 · 속치마 · 허리끈',
      careSteps: ['전문 드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.', '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.', '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'],
    },
    'seolhwamukbi-hanbok': {
      base: 'img/상품/설화먹비',
      galleryFiles: ['설화먹비01.png', '설화먹비02.png', '설화먹비03.png', '정면.png', '측면.png', '설화먹비 악세사리 비녀.png', '설화먹비 악세사리 노리개.png', '설화먹비 악세사리 꽃신.png'],
      collectionLabel: 'YEONHWAJAESIL · SEOLHWAMUKBI COLLECTION',
      storyTitle: '눈꽃이 내려앉은<br>먹빛 가지 사이로',
      storyDesc: '설백색 저고리 위로 먹빛 나뭇가지가 번지듯 그려진 시스루 치마.<br>단아한 흑백의 대비가 고요한 인상을 남깁니다.',
      storyImage: '설화먹비01.png', storyImageAlt: '한옥에서 설화먹비를 착용한 정면 모습',
      whyLabel: 'WHY SEOLHWAMUKBI', whyTitle: '설화먹비를 선택하는<br>세 가지 이유',
      reasons: [
        { title: '완성도 높은 올인원 세트', desc: '설화먹비 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.' },
        { title: '선명한 색감과 디테일', desc: '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.' },
        { title: '편안하고 완성도 높은 연출', desc: '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.' },
      ],
      editorial: [
        { image: '설화먹비02.png', alt: '설화먹비 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>선명한 존재감' },
        { image: '설화먹비03.png', alt: '설화먹비 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 흩날리는<br>먹빛 나뭇가지', reverse: true },
      ],
      designTitle: '단아한 저고리 선과<br>흩날리는 치맛자락',
      designDesc: '설백색 저고리에 매치되는 검정 허리끈과 그 아래로 이어지는 시스루 겹치마. 먹빛으로 그려낸 나뭇가지 무늬가 걸음마다 자연스럽게 흔들립니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '단정한 브이넥 깃', desc: '목선을 감싸는 저고리 깃과 자수 디테일' },
        { title: '매듭 허리끈', desc: '허리를 잡아주는 리본과 술 장식' },
        { title: '번지는 먹빛 가지 무늬', desc: '치맛단을 따라 이어지는 나뭇가지 실루엣' },
      ],
      closeups: [
        { image: '설화먹비02.png', alt: '설화먹비 저고리 자수 디테일', title: '저고리 자수 디테일', desc: '설백색 저고리 위에 은은하게 놓인 자수를 확인해 주세요.' },
        { image: '정면.png', alt: '설화먹비 먹빛 나뭇가지 치맛단', title: '먹빛 나뭇가지 치맛단', desc: '시스루 겹치마 위로 번지는 나뭇가지 무늬를 담았습니다.' },
        { image: '측면.png', alt: '설화먹비 허리 매듭과 실루엣', title: '허리 매듭과 실루엣', desc: '허리끈 매듭과 치마 라인이 만드는 균형을 확인해 주세요.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '설화먹비의 차림을<br>완성하는 구성',
      withDesc: '아래 이미지는 함께 선택할 수 있는 추가 상품입니다. 실제 선택 가능 여부와 가격은 상단 구매 영역에서 확인해 주세요.',
      withItems: [
        { image: '설화먹비 악세사리 비녀.png', caption: '비녀' },
        { image: '설화먹비 악세사리 노리개.png', caption: '노리개' },
        { image: '설화먹비 악세사리 꽃신.png', caption: '꽃신' },
      ],
      colorText: '설백색 · 먹색',
      choiceOptions: [
        { image: '설화먹비 악세사리 비녀.png', caption: '비녀' },
        { image: '설화먹비 악세사리 노리개.png', caption: '노리개' },
        { image: '설화먹비 악세사리 꽃신.png', caption: '꽃신' },
      ],
      specImage: '정면.png', specColor: '설백색 · 먹색', specComposition: '저고리 · 치마 · 속치마 · 허리끈',
      careSteps: ['전문 드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.', '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.', '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'],
    },
    'bombitchyeonbunhong-hanbok': {
      base: 'img/상품/봄빛연분홍',
      galleryFiles: ['봄빛연분홍01.png', '봄빛연분홍02.png', '봄빛연분홍03.png', '정면.png', '측면.png'],
      collectionLabel: 'YEONHWAJAESIL · BOMBIT YEONBUNHONG COLLECTION',
      storyTitle: '벚꽃 흩날리는 봄날,<br>연분홍으로 물들다',
      storyDesc: '화사한 연분홍 치마 위로 은은한 플라워 레이스가 번지는 한 벌.<br>봄의 정취를 그대로 옮겨 담았습니다.',
      storyImage: '봄빛연분홍01.png', storyImageAlt: '벚꽃 아래 봄빛연분홍을 착용한 정면 모습',
      whyLabel: 'WHY BOMBIT YEONBUNHONG', whyTitle: '봄빛연분홍을 선택하는<br>세 가지 이유',
      reasons: [
        { title: '완성도 높은 올인원 세트', desc: '봄빛연분홍 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.' },
        { title: '선명한 색감과 디테일', desc: '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.' },
        { title: '편안하고 완성도 높은 연출', desc: '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.' },
      ],
      editorial: [
        { image: '봄빛연분홍02.png', alt: '봄빛연분홍 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>화사한 존재감' },
        { image: '봄빛연분홍03.png', alt: '봄빛연분홍 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 피어나는<br>연분홍 꽃잎', reverse: true },
      ],
      designTitle: '저고리의 단정한 선과<br>화사한 플라워 레이스',
      designDesc: '화이트 저고리와 연분홍 허리끈이 자연스럽게 이어지고, 치맛단 가득 놓인 플라워 레이스가 봄빛 분위기를 더합니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '단정한 브이넥 저고리', desc: '화이트 톤의 깔끔한 저고리 실루엣' },
        { title: '리본 허리끈', desc: '연분홍 리본과 술 장식이 포인트' },
        { title: '플라워 레이스 치맛단', desc: '치마 전체에 번지는 섬세한 꽃 레이스' },
      ],
      closeups: [
        { image: '봄빛연분홍02.png', alt: '봄빛연분홍 플라워 레이스 디테일', title: '플라워 레이스 디테일', desc: '치마 위에 놓인 섬세한 레이스를 확인해 주세요.' },
        { image: '정면.png', alt: '봄빛연분홍 그라데이션 치맛단', title: '연분홍 그라데이션 치맛단', desc: '은은하게 번지는 연분홍 색감을 담았습니다.' },
        { image: '측면.png', alt: '봄빛연분홍 리본 허리끈과 실루엣', title: '리본 허리끈과 실루엣', desc: '허리 리본과 치마 라인이 만드는 균형을 확인해 주세요.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '봄빛연분홍과<br>함께 즐기는 컬렉션',
      withDesc: '아래 이미지는 봄빛연분홍 컬렉션의 별도 굿즈 상품입니다. 가격과 구매는 각 상품 페이지에서 확인해 주세요.',
      withItems: [
        { image: '봄빛연분홍 아크릴 스텐드.png', caption: '아크릴 스탠드', slug: 'bombitchyeonbunhong-stand' },
        { image: '봄빛연분홍 복주머니.png', caption: '복주머니', slug: 'bombitchyeonbunhong-pouch' },
        { image: '봄빛연분홍 키링.png', caption: '키링', slug: 'bombitchyeonbunhong-keyring' },
        { image: '봄빛연분홍 포토카드.png', caption: '포토카드', slug: 'bombitchyeonbunhong-photocard' },
      ],
      colorText: '설백색 · 연분홍',
      choiceOptions: [],
      specImage: '정면.png', specColor: '설백색 · 연분홍', specComposition: '저고리 · 치마 · 속치마 · 허리끈',
      careSteps: ['전문 드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.', '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.', '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'],
    },
    'meokbitwhayeon-hanbok': {
      base: 'img/상품/먹빛화연',
      galleryFiles: ['먹빛화연01.png', '먹빛화연02.png', '먹빛화연03.png', '정면.png', '측면.png'],
      collectionLabel: 'YEONHWAJAESIL · MEOKBIT WHAYEON COLLECTION',
      storyTitle: '어둠 속에 피어난<br>금빛 꽃무리',
      storyDesc: '짙은 먹빛 시스루 위로 금빛 자수 꽃이 가득 피어난 한 벌.<br>깊은 색과 화려한 디테일이 공존합니다.',
      storyImage: '먹빛화연01.png', storyImageAlt: '먹빛화연을 착용한 정면 모습',
      whyLabel: 'WHY MEOKBIT WHAYEON', whyTitle: '먹빛화연을 선택하는<br>세 가지 이유',
      reasons: [
        { title: '완성도 높은 올인원 세트', desc: '먹빛화연 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.' },
        { title: '선명한 색감과 디테일', desc: '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.' },
        { title: '편안하고 완성도 높은 연출', desc: '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.' },
      ],
      editorial: [
        { image: '먹빛화연02.png', alt: '먹빛화연 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>화려한 존재감' },
        { image: '먹빛화연03.png', alt: '먹빛화연 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 빛나는<br>금빛 자수', reverse: true },
      ],
      designTitle: '짙은 먹빛 위에<br>새겨진 금빛 자수',
      designDesc: '시스루 저고리와 넓은 허리 밴드, 그 위로 가득 놓인 금빛 꽃 자수가 화려하면서도 절제된 인상을 완성합니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '브이넥 저고리 깃', desc: '목선을 감싸는 시스루 소재와 배색' },
        { title: '넓은 허리 밴드', desc: '허리를 잡아주는 벨트형 허리끈과 술 장식' },
        { title: '금빛 자수 치맛단', desc: '치마 전체에 흩뿌려진 화려한 꽃 자수' },
      ],
      closeups: [
        { image: '먹빛화연02.png', alt: '먹빛화연 금빛 자수 디테일', title: '금빛 자수 디테일', desc: '짙은 먹빛 위로 놓인 자수를 가까이서 확인해 주세요.' },
        { image: '정면.png', alt: '먹빛화연 허리 밴드와 술 장식', title: '허리 밴드와 술 장식', desc: '넓은 허리 밴드와 늘어지는 술 장식을 담았습니다.' },
        { image: '측면.png', alt: '먹빛화연 치마 실루엣', title: '치마 실루엣', desc: '움직임에 따라 자연스럽게 퍼지는 실루엣입니다.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '먹빛화연과<br>함께 즐기는 컬렉션',
      withDesc: '아래 이미지는 먹빛화연 컬렉션의 별도 굿즈 상품입니다. 가격과 구매는 각 상품 페이지에서 확인해 주세요.',
      withItems: [
        { image: '먹빛화연 아크릴 스텐드.png', caption: '아크릴 스탠드', slug: 'meokbitwhayeon-stand' },
        { image: '먹빛화연 복주머니.png', caption: '복주머니', slug: 'meokbitwhayeon-pouch' },
        { image: '먹빛화연 키링.png', caption: '키링', slug: 'meokbitwhayeon-keyring' },
        { image: '먹빛화연 포토카드.png', caption: '포토카드', slug: 'meokbitwhayeon-photocard' },
      ],
      colorText: '먹빛 · 금빛',
      choiceOptions: [],
      specImage: '정면.png', specColor: '먹빛 · 금빛', specComposition: '저고리 · 치마 · 속치마 · 허리끈',
      careSteps: ['전문 드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.', '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.', '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'],
    },
    'hongyeonhwadam-hanbok': {
      base: 'img/상품/홍연화담',
      galleryFiles: ['홍연화담01.png', '홍연화담02.png', '홍연화담03.png', '홍연화담04.png', '정면.png', '측면.png'],
      collectionLabel: 'YEONHWAJAESIL · HONGYEONHWADAM COLLECTION',
      storyTitle: '연못에 번지는<br>붉은 연꽃 이야기',
      storyDesc: '화이트 저고리 아래로 짙은 홍빛 치마가 흐르고, 금빛 꽃 자수가 치맛단을 수놓습니다.<br>깊은 색감이 특별한 순간을 완성합니다.',
      storyImage: '홍연화담01.png', storyImageAlt: '한옥에서 홍연화담을 착용한 정면 모습',
      whyLabel: 'WHY HONGYEONHWADAM', whyTitle: '홍연화담을 선택하는<br>세 가지 이유',
      reasons: [
        { title: '완성도 높은 올인원 세트', desc: '홍연화담 한 벌만 준비하면 촬영에 필요한 기본 구성을 바로 갖출 수 있습니다.' },
        { title: '선명한 색감과 디테일', desc: '사진에서도 또렷하게 살아나는 배색과 자수 디테일로 완성했습니다.' },
        { title: '편안하고 완성도 높은 연출', desc: '장시간 촬영이나 행사에도 활동하기 편안한 재단으로 제작했습니다.' },
      ],
      editorial: [
        { image: '홍연화담02.png', alt: '홍연화담 정면 착용 이미지', label: 'THE SILHOUETTE', title: '가만히 서 있어도<br>깊은 존재감' },
        { image: '홍연화담03.png', alt: '홍연화담 측면 착용 이미지', label: 'THE MOVEMENT', title: '걸음마다 흐르는<br>짙은 홍빛', reverse: true },
      ],
      designTitle: '단아한 저고리와<br>짙은 홍빛 치맛자락',
      designDesc: '화이트 저고리에 매치되는 홍빛 허리끈과 그 아래로 흐르는 시스루 치마. 금빛 꽃 자수가 치맛단을 따라 은은하게 빛납니다.',
      designViews: [{ image: '정면.png', caption: 'FRONT · 정면' }, { image: '측면.png', caption: 'SIDE · 측면' }],
      detailNotes: [
        { title: '단정한 저고리 깃', desc: '화이트 톤의 깔끔한 저고리 실루엣' },
        { title: '홍빛 허리끈과 매듭', desc: '허리를 잡아주는 홍빛 리본과 술 장식' },
        { title: '금빛 꽃 자수 치맛단', desc: '치맛단을 따라 은은하게 빛나는 금빛 자수' },
      ],
      closeups: [
        { image: '홍연화담02.png', alt: '홍연화담 금빛 꽃 자수 디테일', title: '금빛 꽃 자수 디테일', desc: '짙은 홍빛 위로 놓인 금빛 자수를 확인해 주세요.' },
        { image: '정면.png', alt: '홍연화담 그라데이션 치맛단', title: '홍빛 그라데이션 치맛단', desc: '짙어지는 홍빛의 농담을 담았습니다.' },
        { image: '측면.png', alt: '홍연화담 허리끈과 실루엣', title: '허리끈과 실루엣', desc: '허리 매듭과 치마 라인이 만드는 균형을 확인해 주세요.' },
      ],
      withLabel: 'WITH ITEMS', withTitle: '홍연화담과<br>함께 즐기는 컬렉션',
      withDesc: '아래 이미지는 홍연화담 컬렉션의 별도 굿즈 상품입니다. 가격과 구매는 각 상품 페이지에서 확인해 주세요.',
      withItems: [
        { image: '아크릴스텐드.png', caption: '아크릴 스탠드', slug: 'hongyeonhwadam-stand' },
        { image: '복주머니.png', caption: '복주머니', slug: 'hongyeonhwadam-pouch' },
        { image: '키링.png', caption: '키링', slug: 'hongyeonhwadam-keyring' },
        { image: '포토카드.png', caption: '포토카드', slug: 'hongyeonhwadam-photocard' },
      ],
      colorText: '설백색 · 진홍색',
      choiceOptions: [],
      specImage: '정면.png', specColor: '설백색 · 진홍색', specComposition: '저고리 · 치마 · 속치마 · 허리끈',
      careSteps: ['전문 드라이클리닝을 권장합니다. 물세탁 시 변형이 있을 수 있습니다.', '장시간 물기·마찰에 노출되면 변색될 수 있으니 주의해주세요.', '습기가 적은 곳에서 옷걸이에 걸어 보관해주세요.'],
    },
  };
  MOON_PRODUCTS.dalbitwhayansobok = MOON_PRODUCTS['dalbitwhayansobok-hanbok'];



  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const topButton = $('#pdpTopBtn');
  if (topButton) {
    const updateTopButton = () => topButton.classList.toggle('is-visible', window.scrollY > 500);
    window.addEventListener('scroll', updateTopButton, { passive: true });
    topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    updateTopButton();
  }

  // 관리자페이지 "미리보기": DB에 저장하지 않고 sessionStorage에 담긴 입력값만으로 이 페이지를 그대로 렌더링합니다.
  const isAdminPreview = params.get('preview') === 'admin';
  let previewData = null;
  if (isAdminPreview) {
    try { previewData = JSON.parse(sessionStorage.getItem('adminProductPreview') || 'null'); } catch (err) { previewData = null; }
    const banner = document.createElement('div');
    banner.textContent = '⚠ 관리자 미리보기 모드입니다. 저장된 내용이 아니며, 실제 구매는 진행되지 않습니다. 확인 후 이 탭을 닫아주세요.';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#7C4DFF;color:#fff;text-align:center;padding:10px;font-size:13px;font-weight:700;';
    document.body.prepend(banner);
    document.body.style.paddingTop = '38px';
  }

  if (supabaseClient) {
    wireCartUI();
    wireAuthUI();
    await applyAuthUI();
  }

  if (!slug && !(isAdminPreview && previewData)) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  const fallbackProduct = slug === 'mukhwayeonmu'
    ? createMukhwaFallbackProduct()
    : (['dalbitwhayansobok', 'dalbitwhayansobok-hanbok'].includes(slug) ? createDalbitFallbackProduct(slug) : null);
  let product = null;
  let error = null;

  if (supabaseClient && !isAdminPreview) {
    const result = await supabaseClient.from('products').select(`
      id, name, slug, product_type, short_description, description,
      regular_price, sale_price, discount_rate,
      collections ( name, slug ),
      categories ( name, slug ),
      product_images ( image_url, image_type, sort_order, is_primary ),
      product_variants ( id, size, stock_quantity, low_stock_threshold ),
      product_size_specs ( size, chest, waist, length, sleeve ),
      product_features ( title, description, sort_order ),
      product_components ( component_name, included, sort_order ),
      product_care ( material, washing, wearing_caution, storage_method ),
      product_shipping_policies ( shipping_fee, free_shipping_threshold, estimated_delivery, exchange_policy, return_policy, refund_policy )
    `)
    .eq('slug', slug)
    .eq('status', 'public')
    .maybeSingle();
    product = result.data;
    error = result.error;
  }

  if ((!product || error) && fallbackProduct) product = fallbackProduct;
  if (isAdminPreview && previewData) { product = previewData.product; error = null; }
  if (product && !isAdminPreview) {
    const images = product.product_images || [];
    const primary = images.find(image => image.is_primary) || images[0];
    const viewed = JSON.parse(localStorage.getItem('yeonhwajaesil_viewed') || '[]').filter(item => item.slug !== product.slug);
    viewed.unshift({ slug: product.slug, name: product.name, image: primary ? primary.image_url : '' });
    localStorage.setItem('yeonhwajaesil_viewed', JSON.stringify(viewed.slice(0, 12)));
  }

  if (error || !product) {
    $('#pdpLoading').hidden = true;
    $('#pdpNotFound').hidden = false;
    return;
  }

  document.title = `${product.name} | 연화재실`;

  // 추가구성(악세사리 addon)은 hanbok 전용 - product_addons -> 대상 상품/재고를 별도 조회 후 합칩니다.
  let addons = [];
  if (supabaseClient && !isAdminPreview && product.product_type === 'hanbok') {
    const { data: addonLinks } = await supabaseClient
      .from('product_addons')
      .select('id, addon_product_id, special_price, sort_order')
      .eq('product_id', product.id)
      .eq('active', true)
      .order('sort_order');
    const addonProductIds = (addonLinks || []).map(a => a.addon_product_id);
    if (addonProductIds.length) {
      const { data: addonProducts } = await supabaseClient
        .from('products')
        .select('id, name, sale_price, product_variants ( id, stock_quantity )')
        .in('id', addonProductIds);
      const byId = new Map((addonProducts || []).map(p => [p.id, p]));
      addons = (addonLinks || [])
        .map(link => {
          const p = byId.get(link.addon_product_id);
          if (!p) return null;
          const variant = (p.product_variants || [])[0];
          return {
            productId: p.id,
            name: p.name,
            price: link.special_price != null ? link.special_price : p.sale_price,
            variantId: variant ? variant.id : null,
            stock: variant ? variant.stock_quantity : 0,
          };
        })
        .filter(Boolean);
    }
  }

  const { data: reviews } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('reviews')
    .select('id, nickname, rating, content, created_at, review_images ( image_url, alt_text ), review_tags ( tag )')
    .eq('product_id', product.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false }) : { data: [] };

  const { data: stats } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('product_review_stats')
    .select('average_rating, review_count')
    .eq('product_id', product.id)
    .maybeSingle() : { data: null };

  const { data: guides } = (supabaseClient && !isAdminPreview) ? await supabaseClient
    .from('wearing_guides')
    .select('step_number, title, description, media_url, media_type')
    .or(`product_id.eq.${product.id},product_id.is.null`)
    .eq('active', true)
    .order('step_number') : { data: [] };

  render(product, addons, reviews || [], stats, guides || []);

  function createMukhwaFallbackProduct() {
    const base = 'img/상품/묵화연무';
    return {
      id: null,
      name: '묵화연무',
      slug: 'mukhwayeonmu',
      product_type: 'hanbok',
      short_description: '수묵화의 농담과 한복의 유려한 선을 담은 현대 한복',
      description: '먹빛과 설백색이 겹쳐 만들어 내는 깊이, 비대칭 저고리와 풍성한 치마가 조화를 이루는 연화재실의 현대 한복입니다.',
      regular_price: 195000,
      sale_price: 195000,
      discount_rate: 0,
      collections: { name: '묵화연무', slug: 'mukhwayeonmu' },
      categories: { name: '저고리', slug: 'jeogori' },
      product_images: [
        ['묵화연무01.png', 1], ['묵화연무02.png', 2], ['묵화연무03.png', 3],
        ['묵화연무04.png', 4], ['정면.png', 5], ['측면.png', 6],
      ].map(([file, sort_order], index) => ({ image_url: `${base}/${file}?v=20260826-detail`, sort_order, is_primary: index === 0, alt_text: `묵화연무 상품 이미지 ${sort_order}` })),
      product_variants: ['S', 'M', 'L'].map(size => ({ id: null, size, stock_quantity: 1, low_stock_threshold: 0 })),
      product_size_specs: [],
      product_features: [
        { title: '비대칭 저고리', description: '전통 한복의 선을 현대적으로 재해석한 어깨선', sort_order: 1 },
        { title: '먹선 자수', description: '수묵화가 번지는 듯한 섬세한 시스루 자수', sort_order: 2 },
      ],
      product_components: [
        { component_name: '저고리', included: true, sort_order: 1 },
        { component_name: '치마', included: true, sort_order: 2 },
      ],
      product_care: { material: '폴리에스터 혼방', washing: '드라이클리닝 권장', wearing_caution: '장식과 얇은 원단의 마찰에 주의해 주세요.', storage_method: '통풍이 잘되는 곳에 걸어서 보관해 주세요.' },
      product_shipping_policies: { shipping_fee: 3000, free_shipping_threshold: 100000, estimated_delivery: '결제 후 3~7일', exchange_policy: '수령 후 7일 이내', return_policy: '착용 흔적이 없는 상품에 한함', refund_policy: '반품 확인 후 영업일 기준 3일 이내' },
    };
  }

  function createDalbitFallbackProduct(productSlug) {
    const base = 'img/상품/달빛하얀소복';
    return {
      id: null,
      name: '달빛하얀소복',
      slug: productSlug || 'dalbitwhayansobok-hanbok',
      product_type: 'hanbok',
      short_description: '달빛처럼 은은한 설백색과 먹빛 그라데이션을 담은 현대 한복',
      description: '부드러운 설백색 위에 먹빛이 번지는 듯한 치마와 단아한 저고리를 조화시킨 연화재실의 프리미엄 현대 한복입니다.',
      regular_price: 199000,
      sale_price: 199000,
      discount_rate: 0,
      collections: { name: '달빛하얀소복', slug: 'dalbitwhayansobok' },
      categories: { name: '저고리', slug: 'jeogori' },
      product_images: [
        ['하얀달빛소복01.png', 1], ['하얀달빛소복02.png', 2], ['하얀달빛소복03.png', 3],
        ['정면.png', 4], ['측면.png', 5],
      ].map(([file, sort_order], index) => ({ image_url: `${base}/${file}`, sort_order, is_primary: index === 0, alt_text: `달빛하얀소복 상품 이미지 ${sort_order}` })),
      product_variants: ['S', 'M', 'L'].map(size => ({ id: null, size, stock_quantity: 1, low_stock_threshold: 0 })),
      product_size_specs: [
        { size: 'S', chest: 84, waist: 66, length: 125, sleeve: 72 },
        { size: 'M', chest: 88, waist: 70, length: 127, sleeve: 73 },
        { size: 'L', chest: 92, waist: 74, length: 129, sleeve: 74 },
      ],
      product_features: [
        { title: '달빛 그라데이션', description: '설백색에서 먹빛으로 은은하게 번지는 치마 색감', sort_order: 1 },
        { title: '입체 꽃 자수', description: '가까이에서 볼수록 섬세한 저고리 자수와 은은한 광택', sort_order: 2 },
      ],
      product_components: [
        { component_name: '저고리', included: true, sort_order: 1 },
        { component_name: '치마', included: true, sort_order: 2 },
        { component_name: '노리개', included: true, sort_order: 3 },
      ],
      product_care: { material: '폴리에스터 혼방', washing: '드라이클리닝 권장', wearing_caution: '자수와 얇은 원단의 마찰에 주의해 주세요.', storage_method: '통풍이 잘되는 곳에 걸어서 보관해 주세요.' },
      product_shipping_policies: { shipping_fee: 3000, free_shipping_threshold: 100000, estimated_delivery: '결제 후 3~7일', exchange_policy: '수령 후 7일 이내', return_policy: '착용 흔적이 없는 상품에 한함', refund_policy: '반품 확인 후 영업일 기준 3일 이내' },
    };
  }

  function render(product, addons, reviews, stats, guides) {
    prepareDalbitNewLayout(product);
    $('#pdpLoading').hidden = true;
    $('#pdpMain').hidden = false;
    $('#pdpPurchaseInfo').hidden = false;
    $('#pdpReviewsSection').hidden = false;

    renderBreadcrumb(product);
    renderGallery(product);
    renderInfo(product, stats);
    renderMukhwaEditorial(product, stats);
    renderDalbitEditorial(product, stats);

    const sizeState = renderSize(product);
    const addonState = renderAddons(addons);
    const qtyState = renderQty();
    const couponState = renderPdpCoupon();

    const recompute = () => updateTotal(product, sizeState, addonState, qtyState, couponState);
    sizeState.onChange = recompute;
    addonState.onChange = recompute;
    qtyState.onChange = recompute;
    couponState.onChange = recompute;
    if (supabaseClient && supabaseClient.auth) {
      supabaseClient.auth.onAuthStateChange(() => {
        window.setTimeout(() => couponState.reload(), 0);
      });
    }
    recompute();

    async function handleCart(openCartAfter) {
      if (isAdminPreview) { showToast('미리보기 모드에서는 장바구니에 담을 수 없습니다.'); return; }
      if (!supabaseClient) { showToast('현재 상품 정보 연결을 확인 중입니다. 잠시 후 다시 시도해주세요.'); return; }
      const variantId = sizeState.getVariantId();
      if (!variantId) { showToast('구매 옵션을 선택해주세요.'); return; }
      const selectedAddons = addonState.getSelected();
      sessionStorage.setItem('yeonhwajaesil_selected_coupon', couponState.getCode());
      const ok = await addToCart({
        productId: product.id,
        variantId,
        name: product.name,
        quantity: qtyState.getQty(),
        addons: selectedAddons.map(a => ({ productId: a.productId, variantId: a.variantId, quantity: qtyState.getQty() })),
      });
      if (ok) {
        recompute();
        if (openCartAfter) {
          openModal('cartModal');
          await renderCartModal();
          await prefillOrderForm();
        }
      }
    }
    $('#pdpAddToCartBtn').addEventListener('click', () => handleCart(false));
    $('#pdpBuyNowBtn').addEventListener('click', () => handleCart(true));

    renderTabs(product);
    renderGuide(guides);
    renderReviews(reviews, stats);
  }

  function getMoonConfig(product) {
    return MOON_PRODUCTS[product.slug] || null;
  }

  function isDalbitProduct(product) {
    return !!getMoonConfig(product);
  }

  function prepareDalbitNewLayout(product) {
    if (!isDalbitProduct(product)) return;
    const main = $('#pdpMain');
    main.className = 'moon-product';
    main.innerHTML = `
      <div class="moon-gallery" aria-label="${product.name} 상품 이미지 갤러리">
        <div class="moon-gallery__stage">
          <img id="pdpMainImage" src="" alt="">
          <span id="pdpGalleryProgress" class="moon-gallery__progress"></span>
        </div>
        <div id="pdpThumbs" class="moon-gallery__thumbs"></div>
      </div>
      <aside class="moon-buy">
        <p id="pdpPath" class="moon-buy__path"></p>
        <h1 id="pdpName" class="moon-buy__name"></h1>
        <p id="pdpDesc" class="moon-buy__desc"></p>
        <p id="pdpRating" class="moon-buy__rating"></p>
        <div id="pdpPrice" class="moon-buy__price"></div>
        <p id="pdpStockNotice" class="moon-buy__stock"></p>
        <div id="pdpSizeWrap" class="moon-option" hidden>
          <div class="moon-option__head"><span>사이즈</span><a href="#moonSizeInfo">사이즈 안내</a></div>
          <div id="pdpSizeButtons" class="moon-size-buttons"></div>
        </div>
        <div id="pdpAddonWrap" class="moon-option" hidden>
          <span class="moon-option__title">추가 구성품</span>
          <div id="pdpAddons" class="moon-addons"></div>
        </div>
        <div class="moon-qty-row"><span>수량</span><div class="moon-qty"><button id="pdpQtyMinus" type="button" aria-label="수량 줄이기">−</button><span id="pdpQtyValue">1</span><button id="pdpQtyPlus" type="button" aria-label="수량 늘리기">+</button></div></div>
        <div class="moon-total"><span>총 구매금액</span><strong id="pdpTotalPrice">0원</strong></div>
        <div class="moon-coupon">
          <label for="pdpCoupon">쿠폰 적용</label>
          <select id="pdpCoupon"><option value="">쿠폰을 선택하세요</option></select>
          <p id="pdpCouponMessage">로그인하면 보유 쿠폰을 확인할 수 있습니다.</p>
          <div class="moon-coupon__discount"><span>쿠폰 할인</span><strong id="pdpCouponDiscount">-0원</strong></div>
        </div>
        <div class="moon-actions"><button id="pdpAddToCartBtn" type="button">장바구니 담기</button><button id="pdpBuyNowBtn" type="button">바로 구매하기</button></div>
        <div class="moon-buy__links"><a href="#moonCare">소재·관리</a><a href="#pdpPurchaseInfo">배송·교환·반품</a><a href="#pdpReviewsSection">상품 후기</a></div>
      </aside>`;
    $('#dalbitEditorial').className = 'moon-detail';
    $('#pdpPurchaseInfo').className = 'moon-service';
    $('#pdpReviewsSection').className = 'moon-reviews';
  }

  function renderDalbitEditorial(product) {
    const cfg = getMoonConfig(product);
    if (!cfg) return;
    const section = $('#dalbitEditorial');
    const base = cfg.base;
    const sizeSpecs = (product.product_size_specs || []).slice().sort((a, b) => ['S', 'M', 'L'].indexOf(a.size) - ['S', 'M', 'L'].indexOf(b.size));
    const sizeRows = (sizeSpecs.length ? sizeSpecs : ['S', 'M', 'L'].map(size => ({ size }))).map(spec => `
      <tr><th>${spec.size}</th><td>${spec.chest || '확인 중'}</td><td>${spec.waist || '확인 중'}</td><td>${spec.length || '확인 중'}</td><td>${spec.sleeve || '확인 중'}</td></tr>`).join('');
    const withItem = item => item.slug
      ? `<figure><a href="product.html?slug=${encodeURIComponent(item.slug)}"><img src="${base}/${item.image}" alt="${item.caption}"></a><figcaption><a href="product.html?slug=${encodeURIComponent(item.slug)}">${item.caption}</a></figcaption></figure>`
      : `<figure><img src="${base}/${item.image}" alt="${item.caption}"><figcaption>${item.caption}</figcaption></figure>`;
    section.hidden = false;
    section.innerHTML = `
      <nav class="moon-nav" aria-label="상품 상세 메뉴">
        <a class="is-active" href="#moonStory">상품 설명</a><a href="#moonDetails">디자인·소재</a><a href="#moonWith">구성품</a><a href="#pdpPurchaseInfo">배송 안내</a><a href="#pdpReviewsSection">구매 후기</a>
      </nav>
      <section id="moonStory" class="moon-story">
        <p class="moon-kicker">${cfg.collectionLabel}</p>
        <h2>${cfg.storyTitle}</h2>
        <p>${cfg.storyDesc}</p>
        <img src="${base}/${cfg.storyImage}" alt="${cfg.storyImageAlt}">
      </section>

      <section class="moon-benefits">
        <div class="moon-section-title"><span>${cfg.whyLabel}</span><h3>${cfg.whyTitle}</h3></div>
        <div class="moon-benefits__grid">
          ${cfg.reasons.map((r, i) => `<article><b>0${i + 1}</b><h4>${r.title}</h4><p>${r.desc}</p></article>`).join('')}
        </div>
      </section>

      <section class="moon-editorial">
        ${cfg.editorial.map(e => `<figure${e.reverse ? ' class="is-reverse"' : ''}><img src="${base}/${e.image}" alt="${e.alt}"><figcaption><span>${e.label}</span><strong>${e.title}</strong></figcaption></figure>`).join('')}
      </section>

      <section id="moonDetails" class="moon-design">
        <div class="moon-section-title"><span>DESIGN & FABRIC</span><h3>${cfg.designTitle}</h3><p>${cfg.designDesc}</p></div>
        <div class="moon-design__views">
          ${cfg.designViews.map(v => `<figure><img src="${base}/${v.image}" alt="${product.name} ${v.caption} 상품 이미지"><figcaption>${v.caption}</figcaption></figure>`).join('')}
        </div>
        <div class="moon-detail-notes">${cfg.detailNotes.map(n => `<article><b>${n.title}</b><p>${n.desc}</p></article>`).join('')}</div>
        <div class="moon-closeup">
          <div class="moon-section-title"><span>SMALL DETAILS</span><h3>작은 디테일까지<br>세심하게</h3></div>
          <div class="moon-closeup__grid">
            ${cfg.closeups.map(c => `<figure><img src="${base}/${c.image}" alt="${c.alt}"><figcaption><b>${c.title}</b><span>${c.desc}</span></figcaption></figure>`).join('')}
          </div>
        </div>
      </section>

      <section id="moonWith" class="moon-with">
        <div class="moon-section-title"><span>${cfg.withLabel}</span><h3>${cfg.withTitle}</h3><p>${cfg.withDesc}</p></div>
        <div class="moon-with__accessories">
          ${cfg.withItems.map(withItem).join('')}
        </div>
      </section>

      <section class="moon-choice">
        <div class="moon-section-title"><span>COLOR${cfg.choiceOptions.length ? ' · OPTION' : ''} · SIZE</span><h3>컬러${cfg.choiceOptions.length ? ', 옵션' : ''} &amp; 사이즈</h3></div>
        <div class="moon-choice__color"><div class="moon-choice__swatches"><i class="is-white"></i><i class="is-ink"></i></div><div><b>COLOR</b><p>${cfg.colorText}</p><small>모니터 환경에 따라 실제 색상이 다르게 보일 수 있습니다.</small></div></div>
        ${cfg.choiceOptions.length ? `<div class="moon-choice__options">${cfg.choiceOptions.map(o => `<figure><img src="${base}/${o.image}" alt="추가 옵션 ${o.caption}"><figcaption>${o.caption}</figcaption></figure>`).join('')}</div>` : ''}
        <div class="moon-choice__sizes"><b>SIZE</b><div><span>S</span><span>M</span><span>L</span></div><a href="#pdpMain">상단에서 사이즈 선택하기 ↑</a></div>
      </section>

      <section id="moonSizeInfo" class="moon-spec">
        <div class="moon-section-title"><span>PRODUCT INFORMATION</span><h3>구매 전<br>꼭 확인하세요</h3></div>
        <div class="moon-spec__layout">
          <figure><img src="${base}/${cfg.specImage}" alt="${product.name} 정면 제품 정보 이미지"><figcaption>실제 정보는 판매 옵션에서 확인해 주세요.</figcaption></figure>
          <dl><div><dt>브랜드명</dt><dd>연화재실</dd></div><div><dt>제품명</dt><dd>${product.name}</dd></div><div><dt>색상</dt><dd>${cfg.specColor}</dd></div><div><dt>소재</dt><dd>${product.product_care && product.product_care.material ? product.product_care.material : '폴리에스터 혼방'}</dd></div><div><dt>구성</dt><dd>${cfg.specComposition}</dd></div><div><dt>사이즈</dt><dd>S · M · L</dd></div></dl>
        </div>
        <div class="moon-size-chart">
          <div class="moon-size-chart__visual"><img src="img/컨셉사진/사이즈.png" alt="한복 실측 위치(어깨너비·가슴둘레·허리둘레·소매길이·소매너비·총기장) 안내 도식"><span>실측 위치 참고</span></div>
          <div class="moon-size-chart__table"><h4>정확한 사이즈</h4><p>단위: cm</p><table><thead><tr><th>사이즈</th><th>가슴</th><th>허리</th><th>총장</th><th>소매</th></tr></thead><tbody>${sizeRows}</tbody></table></div>
        </div>
        <p class="moon-spec__notice">제품 정보에 제공되지 않은 소재 및 실측 수치는 임의로 표기하지 않았습니다.</p>
        <small class="moon-spec__footnote">측정 위치와 방법에 따라 약간의 오차가 있을 수 있습니다.</small>
      </section>

      <section id="moonCare" class="moon-care">
        <div class="moon-section-title"><span>CARE GUIDE</span><h3>오래도록 아름답게</h3></div>
        <ol>${cfg.careSteps.map((step, i) => `<li><b>0${i + 1}</b><span>${step}</span></li>`).join('')}</ol>
      </section>`;
  }

  function renderDalbitEditorialLegacy(product, stats) {
    if (!['dalbitwhayansobok', 'dalbitwhayansobok-hanbok'].includes(product.slug)) return;

    const section = $('#dalbitEditorial');
    const base = 'img/상품/달빛하얀소복';
    const rating = stats && stats.review_count > 0 ? stats.average_rating : '4.9';
    const reviewCount = stats && stats.review_count > 0 ? `${stats.review_count}개의 실제 구매 후기` : '먼저 만나본 고객의 높은 만족도';
    section.hidden = false;
    section.innerHTML = `
      <nav class="dalbit-detail-nav" aria-label="상품 상세 메뉴">
        <a class="is-active" href="#dalbitStory">상품상세</a>
        <a href="#pdpReviewsSection">후기</a>
        <a href="#pdpPurchaseInfo">배송·교환</a>
        <a href="#dalbitWithItems">함께 보기</a>
      </nav>
      <section class="dalbit-hero">
        <span id="dalbitStory"></span>
        <p class="dalbit-number">01</p>
        <p class="dalbit-eyebrow">연화재실</p>
        <h2>달빛하얀소복</h2>
        <p>달빛 아래 피어난 순백의 설렘.<br>은은한 먹빛이 번지는 치마와 단아한 저고리로<br>당신의 가장 아름다운 순간을 완성합니다.</p>
        <img src="${base}/하얀달빛소복01.png" alt="한옥에서 착용한 달빛하얀소복">
      </section>

      <section class="dalbit-rating dalbit-color-size">
        <p class="dalbit-number">02</p>
        <p class="dalbit-eyebrow">COLOR & SIZE</p>
        <h3>달빛을 닮은<br>아이보리와 먹빛</h3>
        <div class="dalbit-color-size__swatch"><i></i><span>아이보리 · 먹빛</span></div>
        <div class="dalbit-size-pills" aria-label="선택 가능한 사이즈"><span>S</span><span>M</span><span>L</span></div>
        <p>화면 환경에 따라 실제 제품의 색상이 조금 다르게 보일 수 있습니다.<br>구매 영역에서 원하는 사이즈를 선택해 주세요.</p>
      </section>

      <section class="dalbit-reasons">
        <p class="dalbit-number">03</p>
        <p class="dalbit-eyebrow">KEY POINT</p>
        <h3>달빛하얀소복의<br>세 가지 핵심</h3>
        <div class="dalbit-reason-grid">
          <article><span>01</span><img src="${base}/하얀달빛소복01.png" alt="달빛하얀소복 전체 실루엣"><b>사진으로 남는 우아한 실루엣</b><p>풍성하게 퍼지는 치마가 어느 각도에서도 단아한 선을 만듭니다.</p></article>
          <article><span>02</span><img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 저고리 디테일"><b>가까이에서 빛나는 섬세한 자수</b><p>은은한 광택과 입체적인 꽃 자수가 얼굴빛을 화사하게 살려줍니다.</p></article>
          <article><span>03</span><img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 뒷모습"><b>달빛처럼 번지는 먹빛 그라데이션</b><p>설백색에서 먹빛으로 이어지는 농담이 깊이 있는 분위기를 완성합니다.</p></article>
        </div>
      </section>

      <section class="dalbit-point">
        <p class="dalbit-number">04</p><p class="dalbit-eyebrow">POINT 01</p>
        <h3>부드러운 색감이 만드는<br>절제된 우아함</h3>
        <p>화려한 장식에 기대기보다 아이보리와 먹빛의 세련된 배색으로<br>차분하면서도 오래 기억되는 분위기를 완성합니다.</p>
        <img src="${base}/하얀달빛소복01.png" alt="달빛하얀소복 야외 화보">
      </section>

      <section class="dalbit-point dalbit-point--soft">
        <p class="dalbit-number">05</p><p class="dalbit-eyebrow">POINT 02</p>
        <h3>한복의 선은 그대로,<br>움직임은 편안하게</h3>
        <p>단아한 깃과 풍성한 치마의 선을 살리면서도<br>촬영과 행사 내내 자연스럽게 움직일 수 있도록 구성했습니다.</p>
        <img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 옆모습과 치마선">
        <img class="dalbit-point__detail" src="${base}/측면.png" alt="달빛하얀소복 측면 실루엣">
      </section>

      <section class="dalbit-point">
        <p class="dalbit-number">06</p><p class="dalbit-eyebrow">POINT 03</p>
        <h3>빛을 만날수록<br>선명해지는 실루엣</h3>
        <p>자연광과 실내 조명 아래에서 색의 농담과 치마선이 살아나<br>웨딩·돌잔치·가족사진 등 특별한 순간을 돋보이게 합니다.</p>
        <img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 뒷모습 화보">
      </section>

      <section class="dalbit-compare">
        <p class="dalbit-eyebrow">DETAIL INFO</p>
        <h3>앞과 옆,<br>어느 각도에서도 단정하게</h3>
        <p>제품의 실제 형태와 먹빛의 흐름을 확인해 보세요.</p>
        <div class="dalbit-product-view-grid">
          <figure><img src="${base}/정면.png" alt="달빛하얀소복 정면 상품 이미지"><figcaption>FRONT</figcaption></figure>
          <figure><img src="${base}/측면.png" alt="달빛하얀소복 측면 상품 이미지"><figcaption>SIDE</figcaption></figure>
        </div>
      </section>

      <section class="dalbit-details">
        <p class="dalbit-eyebrow">FABRIC & DETAIL</p>
        <h3>작은 디테일까지<br>세심하게</h3>
        <div class="dalbit-detail-grid">
          <article><img src="${base}/하얀달빛소복02.png" alt="달빛하얀소복 저고리와 허리선"><span>01</span><b>단정하게 이어지는 저고리 선</b><p>깃부터 허리까지 부드럽게 연결되는 단아한 균형</p></article>
          <article><img src="${base}/하얀달빛소복03.png" alt="달빛하얀소복 치마와 먹빛 표현"><span>02</span><b>움직임에 살아나는 치마선</b><p>풍성한 실루엣 위로 번지는 먹빛이 만드는 깊은 여운</p></article>
        </div>
      </section>

      <section id="dalbitWithItems" class="dalbit-options">
        <p class="dalbit-eyebrow">WITH ITEM</p>
        <h3>달빛하얀소복과<br>함께 완성하는 차림</h3>
        <p>한복과 함께 선택할 수 있는 세 가지 옵션입니다.</p>
        <div class="dalbit-option-grid">
          <figure><img src="${base}/하얀달빛소복 악세사리 비녀.png" alt="비녀"><figcaption>비녀</figcaption></figure>
          <figure><img src="${base}/하얀달빛소복 악세사리 노리개.png" alt="노리개"><figcaption>노리개</figcaption></figure>
          <figure><img src="${base}/하얀달빛소복 악세사리 꽃신.png" alt="꽃신"><figcaption>꽃신</figcaption></figure>
        </div>
        <div class="dalbit-goods">
          <p class="dalbit-eyebrow">DALBIT COLLECTION GOODS</p>
          <h4>함께 보는 달빛하얀소복 컬렉션</h4>
          <p>아래 제품은 한복 구성품이 아닌 별도 상품입니다.</p>
          <div class="dalbit-goods-grid">
            <figure><img src="${base}/하얀달빛소복 복주머니.png" alt="달빛하얀소복 복주머니"><figcaption>복주머니 <small>별도 상품</small></figcaption></figure>
            <figure><img src="${base}/하얀달빛소복 아크릴 스텐드.png" alt="달빛하얀소복 아크릴 스탠드"><figcaption>아크릴 스탠드 <small>별도 상품</small></figcaption></figure>
            <figure><img src="${base}/하얀달빛소복 키링.png" alt="달빛하얀소복 키링"><figcaption>키링 <small>별도 상품</small></figcaption></figure>
            <figure><img src="${base}/하얀달빛소복 포토카드.png" alt="달빛하얀소복 포토카드"><figcaption>포토카드 <small>별도 상품</small></figcaption></figure>
          </div>
        </div>
      </section>

      <section class="dalbit-product-info">
        <p class="dalbit-eyebrow">PRODUCT INFORMATION</p>
        <h3>구매 전<br>꼭 확인하세요</h3>
        <div class="dalbit-info-visual">
          <img src="${base}/측면.png" alt="달빛하얀소복 측면 상품 이미지">
          <div><b>SIZE</b><span>S</span><span>M</span><span>L</span><p>신체 치수와 선호하는 착용감에 맞춰 선택해 주세요.</p></div>
        </div>
        <dl class="dalbit-info-table">
          <div><dt>브랜드</dt><dd>연화재실</dd></div>
          <div><dt>제품명</dt><dd>달빛하얀소복</dd></div>
          <div><dt>색상</dt><dd>아이보리 · 먹빛</dd></div>
          <div><dt>옵션</dt><dd>비녀 · 꽃신 · 노리개</dd></div>
          <div><dt>사이즈</dt><dd>S · M · L</dd></div>
        </dl>
        <p class="dalbit-measure-note">측정 위치와 방법에 따라 약간의 오차가 있을 수 있습니다.</p>
        <a class="dalbit-purchase-link" href="#pdpMain">사이즈 선택하고 구매하기 ↑</a>
      </section>`;
  }

  function renderMukhwaEditorial(product, stats) {
    if (product.slug !== 'mukhwayeonmu') return;

    const section = $('#mukhwaEditorial');
    const base = 'img/상품/묵화연무';
    const rating = stats && stats.review_count > 0 ? stats.average_rating : '4.9';
    const reviewCount = stats && stats.review_count > 0 ? `${stats.review_count}개의 실제 후기` : '먼저 만나본 고객의 높은 만족도';
    section.hidden = false;
    section.innerHTML = `
      <div class="mukhwa-hero">
        <div class="mukhwa-kicker">연화재실 현대 한복 컬렉션</div>
        <h2>먹빛의 여백 위로 피어나는<br><strong>묵화연무</strong></h2>
        <p>수묵화처럼 번지는 흑백의 농담과 한복의 유려한 선을 한 벌에 담았습니다.<br>고요하지만 분명한 존재감으로 특별한 날의 장면을 완성합니다.</p>
        <img src="${base}/묵화연무02.png?v=20260826-card-fit" alt="묵화연무 정면 착용 모습">
      </div>

      <div class="mukhwa-rating">
        <p class="mukhwa-label">고객 만족도</p>
        <div><strong>${rating}</strong><span>/ 5</span></div>
        <p class="mukhwa-stars">★★★★★</p>
        <h3>사진으로 본 순간보다<br>입었을 때 더 특별한 한복</h3>
        <p>${reviewCount}</p>
      </div>

      <div class="mukhwa-reasons">
        <p class="mukhwa-label">WHY MUKHWA YEONMU</p>
        <h3>왜 묵화연무를 선택할까요?</h3>
        <article>
          <span>01</span><div><b>흑과 백이 만드는 선명한 조화</b><p>과하지 않은 무채색 배색이 얼굴빛과 실루엣을 또렷하게 살려줍니다.</p></div>
          <img src="${base}/정면.png" alt="묵화연무 정면 제품 이미지">
        </article>
        <article>
          <span>02</span><div><b>움직일 때 살아나는 겹의 아름다움</b><p>가볍게 겹친 시스루 원단이 걸음마다 먹의 농담처럼 자연스럽게 번집니다.</p></div>
          <img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="묵화연무 움직임과 겹 디테일">
        </article>
        <article>
          <span>03</span><div><b>전통과 현대를 잇는 비대칭 디자인</b><p>한복의 곡선은 유지하고 비대칭 어깨선과 허리 장식으로 현대적인 인상을 더했습니다.</p></div>
          <img src="${base}/묵화연무03.png?v=20260826-card-fit" alt="묵화연무 측면 실루엣">
        </article>
      </div>

      <div class="mukhwa-story mukhwa-story--dark">
        <p class="mukhwa-label">POINT 01</p>
        <h3>고요하게 번지는<br>먹빛의 우아함</h3>
        <p>절제된 색 안에서 소재의 결, 자수의 선, 치마의 움직임이 더욱 선명하게 드러납니다.</p>
        <img src="${base}/묵화연무04.png?v=20260826-card-fit" alt="고요한 먹빛의 묵화연무 화보">
      </div>

      <div class="mukhwa-story mukhwa-story--light">
        <p class="mukhwa-label">POINT 02</p>
        <h3>전통의 선은 그대로,<br>오늘의 감각은 더 깊게</h3>
        <p>깃과 고름에서 출발한 선을 비대칭 숄더와 넓은 허리 장식으로 다시 해석했습니다.</p>
        <img src="${base}/측면.png" alt="묵화연무 측면 제품 이미지">
      </div>

      <div class="mukhwa-scenes">
        <p class="mukhwa-label">POINT 03</p>
        <h3>한옥에서도, 스튜디오에서도<br>빛나는 한 벌</h3>
        <div class="mukhwa-scenes__grid">
          <img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="한옥에서 착용한 묵화연무">
          <img src="${base}/묵화연무02.png?v=20260826-card-fit" alt="자연광에서 착용한 묵화연무">
        </div>
      </div>

      <div class="mukhwa-compare">
        <p class="mukhwa-label">DESIGN DIFFERENCE</p>
        <h3>평범한 흑백 한복과<br>묵화연무는 무엇이 다를까요?</h3>
        <div class="mukhwa-compare__grid">
          <div><span>YEONHWAJAESIL</span><img src="${base}/정면.png" alt="묵화연무 정면"><b>비대칭 실루엣과 입체적인 겹</b></div>
          <div><span>DETAIL</span><img src="${base}/측면.png" alt="묵화연무 측면"><b>먹선 자수와 섬세한 허리 장식</b></div>
        </div>
      </div>

      <div class="mukhwa-details">
        <p class="mukhwa-label">FABRIC & DETAIL</p>
        <h3>가까이에서 볼수록<br>더 섬세한 이야기</h3>
        <div class="mukhwa-details__grid">
          <article><img src="${base}/묵화연무03.png?v=20260826-card-fit" alt="묵화연무 시스루 자수"><b>먹선 자수 시스루</b><p>가볍고 투명한 원단 위에 번지는 듯한 자수를 더했습니다.</p></article>
          <article><img src="${base}/묵화연무04.png?v=20260826-card-fit" alt="묵화연무 허리 장식"><b>입체적인 허리 장식</b><p>시선을 중앙으로 모아 비율을 안정적으로 잡아줍니다.</p></article>
          <article><img src="${base}/묵화연무01.png?v=20260826-card-fit" alt="묵화연무 치마 겹"><b>풍성한 치마의 겹</b><p>흰빛과 먹빛 원단을 겹쳐 움직임마다 깊이가 달라집니다.</p></article>
        </div>
      </div>

      <div class="mukhwa-options">
        <p class="mukhwa-label">COLOR, OPTION & SIZE</p>
        <h3>나에게 맞는 묵화연무</h3>
        <div class="mukhwa-options__palette"><i></i><div><b>COLOR</b><p>먹색 · 설백색</p></div></div>
        <div class="mukhwa-options__items">
          <figure><img src="${base}/묵화연무 악세사리 비녀.png" alt="묵화연무 비녀"><figcaption>비녀</figcaption></figure>
          <figure><img src="${base}/묵화연무 악세사리 노리개.png" alt="묵화연무 노리개"><figcaption>노리개</figcaption></figure>
          <figure><img src="${base}/묵화연무 악세사리 꽃신.png" alt="묵화연무 꽃신"><figcaption>꽃신</figcaption></figure>
        </div>
        <div class="mukhwa-size-guide">
          <b>SIZE</b><p>상단 구매 영역에서 S · M · L 중 선택할 수 있습니다.</p>
          <a href="#pdpMain">구매 옵션 확인하기 ↑</a>
        </div>
      </div>`;
  }

  function renderBreadcrumb(product) {
    const typeLabel = PRODUCT_TYPE_LABEL[product.product_type] || '';
    $('#pdpBreadcrumb').textContent = `홈 - ${typeLabel} - ${product.name}`;
    $('#pdpPath').textContent = `연화재실 - ${typeLabel} - ${product.collections ? product.collections.name : ''}`;
  }

  function renderGallery(product) {
    const moonCfg = getMoonConfig(product);
    const images = moonCfg
      ? moonCfg.galleryFiles.map((file, index) => ({ image_url: `${moonCfg.base}/${file}`, sort_order: index + 1, alt_text: `${product.name} 상품 이미지 ${index + 1}` }))
      : (product.product_images || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const mainImg = $('#pdpMainImage');
    const thumbs = $('#pdpThumbs');
    const progress = $('#pdpGalleryProgress');
    thumbs.innerHTML = '';

    function syncGalleryHeight() {
      if (!isDalbitProduct(product)) return;
      if (window.matchMedia('(max-width: 900px)').matches) {
        thumbs.style.height = 'auto';
        const mobileStage = mainImg.closest('.moon-gallery__stage');
        if (mobileStage) mobileStage.style.height = 'auto';
        return;
      }
      const stage = mainImg.closest('.moon-gallery__stage');
      const buy = document.querySelector('.moon-buy');
      const actions = document.querySelector('.moon-actions');
      if (!stage || !buy || !actions) return;
      const targetHeight = Math.ceil(actions.getBoundingClientRect().bottom - buy.getBoundingClientRect().top);
      if (targetHeight > 0) {
        stage.style.height = `${targetHeight}px`;
        thumbs.style.height = `${targetHeight}px`;
      }
    }
    mainImg.addEventListener('load', () => requestAnimationFrame(syncGalleryHeight));
    window.addEventListener('resize', syncGalleryHeight);
    if ('ResizeObserver' in window) {
      const purchaseResizeObserver = new ResizeObserver(() => requestAnimationFrame(syncGalleryHeight));
      requestAnimationFrame(() => {
        const buy = document.querySelector('.moon-buy');
        if (buy) purchaseResizeObserver.observe(buy);
      });
    }

    if (!images.length) { mainImg.alt = product.name; return; }

    function show(idx) {
      mainImg.src = images[idx].image_url;
      mainImg.alt = images[idx].alt_text || product.name;
      progress.textContent = `[${idx + 1}/${images.length}]`;
      $all('img', thumbs).forEach((t, i) => t.classList.toggle('is-active', i === idx));
      if (mainImg.complete) requestAnimationFrame(syncGalleryHeight);
    }

    images.forEach((img, i) => {
      const t = document.createElement('img');
      t.src = img.image_url;
      t.alt = img.alt_text || product.name;
      t.addEventListener('click', () => show(i));
      thumbs.appendChild(t);
    });
    show(0);
  }

  function renderInfo(product, stats) {
    $('#pdpName').textContent = product.name;
    $('#pdpDesc').textContent = product.description || product.short_description || '';
    const price = $('#pdpPrice');
    const regular = Number(product.regular_price || product.sale_price || 0);
    const sale = Number(product.sale_price || regular);
    const discount = regular > sale ? Math.round((1 - sale / regular) * 100) : Number(product.discount_rate || 0);
    if (isDalbitProduct(product)) {
      price.innerHTML = discount > 0
        ? `<span class="moon-buy__sale-label">SALE</span><span class="moon-buy__discount">${discount}%</span><strong>${formatWon(sale)}</strong><del aria-label="원가">${formatWon(regular)}</del>`
        : `<span class="moon-buy__sale-label">정상가</span><span class="moon-buy__discount">0%</span><strong>${formatWon(sale)}</strong><span class="moon-buy__regular">원가 ${formatWon(regular)}</span>`;
      const variants = product.product_variants || [];
      const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0);
      const stock = $('#pdpStockNotice');
      if (stock) {
        stock.textContent = totalStock > 0 ? `재고 있음 · 지금 주문 가능` : '품절 · 재입고 알림을 신청해 주세요';
        stock.classList.toggle('is-soldout', totalStock <= 0);
      }
    } else {
      price.textContent = formatWon(sale);
    }
    if (stats && stats.review_count > 0) {
      $('#pdpRating').textContent = `★ ${stats.average_rating} (${stats.review_count})`;
    } else {
      $('#pdpRating').textContent = '아직 등록된 후기가 없어요';
    }
  }

  function renderSize(product) {
    const wrap = $('#pdpSizeWrap');
    const btnWrap = $('#pdpSizeButtons');
    const variants = (product.product_variants || []);
    let selectedVariantId = null;
    const state = { onChange: null, getVariantId: () => selectedVariantId };

    const isFlowerShoes = product.categories && product.categories.slug === 'flowershoes';
    if (product.product_type !== 'hanbok' && !isFlowerShoes) {
      // FREE 사이즈 단일 옵션 - 버튼 없이 자동 선택
      selectedVariantId = variants[0] ? variants[0].id : null;
      return state;
    }

    wrap.hidden = false;
    btnWrap.innerHTML = '';
    const sizeOrder = isFlowerShoes ? ['220', '230', '240'] : ['S', 'M', 'L'];
    const sizeLabels = isFlowerShoes
      ? { '220': 'S [220]', '230': 'M [230]', '240': 'L [240]' }
      : { S: 'S', M: 'M', L: 'L' };
    const bySize = new Map(variants.map(v => [v.size, v]));
    sizeOrder.forEach(size => {
      const v = bySize.get(size);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = sizeLabels[size];
      if (!v || v.stock_quantity <= 0) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          selectedVariantId = v.id;
          $all('button', btnWrap).forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          if (state.onChange) state.onChange();
        });
      }
      btnWrap.appendChild(btn);
    });
    // 재고가 있는 첫 사이즈를 기본 선택
    const firstAvailable = sizeOrder.map(s => bySize.get(s)).find(v => v && v.stock_quantity > 0);
    if (firstAvailable) {
      selectedVariantId = firstAvailable.id;
      const idx = sizeOrder.indexOf(firstAvailable.size);
      $all('button', btnWrap)[idx].classList.add('is-active');
    }
    return state;
  }

  function renderAddons(addons) {
    const wrap = $('#pdpAddonWrap');
    const listEl = $('#pdpAddons');
    const state = { onChange: null, getSelected: () => [] };
    if (!addons.length) return state;

    wrap.hidden = false;
    listEl.innerHTML = '';
    const checked = new Set();
    addons.forEach(a => {
      const label = document.createElement('label');
      const soldOut = !a.variantId || a.stock <= 0;
      label.innerHTML = `
        <span><input type="checkbox" ${soldOut ? 'disabled' : ''}> ${a.name}${soldOut ? ' (품절)' : ''}</span>
        <span class="addon-price">+${formatWon(a.price)}</span>`;
      const checkbox = label.querySelector('input');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) checked.add(a.productId); else checked.delete(a.productId);
        if (state.onChange) state.onChange();
      });
      listEl.appendChild(label);
    });
    state.getSelected = () => addons.filter(a => checked.has(a.productId));
    return state;
  }

  function renderQty() {
    let qty = 1;
    const valueEl = $('#pdpQtyValue');
    const state = { onChange: null, getQty: () => qty };
    $('#pdpQtyMinus').addEventListener('click', () => {
      if (qty <= 1) return;
      qty -= 1; valueEl.textContent = qty;
      if (state.onChange) state.onChange();
    });
    $('#pdpQtyPlus').addEventListener('click', () => {
      qty += 1; valueEl.textContent = qty;
      if (state.onChange) state.onChange();
    });
    return state;
  }

  function renderPdpCoupon() {
    const select = $('#pdpCoupon');
    const message = $('#pdpCouponMessage');
    const state = {
      onChange: null,
      reload: async () => {},
      getCode: () => select ? select.value : '',
      getDiscount: subtotal => {
        const option = select && select.selectedOptions ? select.selectedOptions[0] : null;
        if (!option || !option.value) return 0;
        if (subtotal < Number(option.dataset.minOrder || 0)) return 0;
        const value = Number(option.dataset.discountValue || 0);
        let discount = option.dataset.discountType === 'percent' ? Math.floor(subtotal * value / 100) : value;
        const maximum = Number(option.dataset.maxDiscount || 0);
        if (maximum > 0) discount = Math.min(discount, maximum);
        return Math.min(discount, subtotal);
      },
    };
    if (!select || !supabaseClient) return state;
    select.addEventListener('change', () => {
      sessionStorage.setItem('yeonhwajaesil_selected_coupon', select.value);
      if (state.onChange) state.onChange();
    });
    async function loadCoupons() {
      const saved = sessionStorage.getItem('yeonhwajaesil_selected_coupon') || '';
      select.innerHTML = '<option value="">쿠폰을 선택하세요</option>';
      select.disabled = true;
      const session = await getCurrentSession();
      if (!session) {
        message.textContent = '로그인하면 보유 쿠폰을 확인할 수 있습니다.';
        if (state.onChange) state.onChange();
        return;
      }
      message.textContent = '보유 쿠폰을 불러오는 중입니다.';
      const { data, error: couponError } = await supabaseClient.from('user_coupons')
        .select('id, coupons ( code, name, discount_type, discount_value, min_order_amount, max_discount_amount, ends_at )')
        .eq('user_id', session.user.id).eq('status', 'issued');
      if (couponError) {
        message.textContent = '쿠폰 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
        return;
      }
      (data || []).forEach(row => {
        const coupon = row.coupons;
        if (!coupon || (coupon.ends_at && new Date(coupon.ends_at) < new Date())) return;
        const option = document.createElement('option');
        option.value = coupon.code;
        option.textContent = `${coupon.name} · ${coupon.discount_type === 'percent' ? coupon.discount_value + '%' : formatWon(coupon.discount_value)} 할인`;
        option.dataset.discountType = coupon.discount_type;
        option.dataset.discountValue = coupon.discount_value;
        option.dataset.minOrder = coupon.min_order_amount || 0;
        option.dataset.maxDiscount = coupon.max_discount_amount || 0;
        select.appendChild(option);
      });
      select.disabled = false;
      if ([...select.options].some(option => option.value === saved)) select.value = saved;
      message.textContent = select.options.length > 1 ? '쿠폰을 선택하면 할인금액이 바로 반영됩니다.' : '현재 사용 가능한 쿠폰이 없습니다.';
      if (state.onChange) state.onChange();
    }
    state.reload = loadCoupons;
    loadCoupons();
    return state;
  }

  function updateTotal(product, sizeState, addonState, qtyState, couponState) {
    const addonUnitSum = addonState.getSelected().reduce((s, a) => s + a.price, 0);
    const subtotal = (product.sale_price + addonUnitSum) * qtyState.getQty();
    const discount = couponState ? couponState.getDiscount(subtotal) : 0;
    if ($('#pdpCouponDiscount')) $('#pdpCouponDiscount').textContent = '-' + formatWon(discount);
    $('#pdpTotalPrice').textContent = formatWon(Math.max(subtotal - discount, 0));
  }

  function renderTabs(product) {
    const tabs = $all('.pdp-tab');
    const panels = $all('.pdp-tab-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        panels.forEach(p => p.hidden = p.dataset.panel !== tab.dataset.tab);
      });
    });

    const features = (product.product_features || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const components = (product.product_components || []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const sizeSpecs = product.product_size_specs || [];

    const featureHtml = features.length
      ? `<ul class="pdp-feature-list">${features.map((f, i) => `<li><b>0${i + 1}. ${f.title}</b> — ${f.description || ''}</li>`).join('')}</ul>`
      : '';
    const componentHtml = components.length
      ? `<h4>기본 구성품</h4><div class="pdp-component-list">${components.map(c => `<span>${c.component_name}</span>`).join('')}</div>`
      : '';
    const sizeTableHtml = sizeSpecs.length
      ? `<h4>사이즈표</h4><table class="pdp-size-table"><thead><tr><th>사이즈</th><th>가슴</th><th>허리</th><th>총장</th></tr></thead><tbody>
          ${sizeSpecs.map(s => `<tr><td>${s.size}</td><td>${s.chest || '-'}</td><td>${s.waist || '-'}</td><td>${s.length || '-'}</td></tr>`).join('')}
         </tbody></table>`
      : '';
    $('[data-panel="detail"]').innerHTML =
      `<p>${(product.description || product.short_description || '등록된 상세설명이 없습니다.').replace(/\n/g, '<br>')}</p>${featureHtml}${componentHtml}${sizeTableHtml}`
      || '<p>등록된 상세정보가 없습니다.</p>';

    const care = product.product_care;
    $('[data-panel="care"]').innerHTML = care
      ? `<h4>소재</h4><p>${care.material || '-'}</p>
         <h4>세탁법</h4><p>${care.washing || '-'}</p>
         <h4>착용 주의사항</h4><p>${care.wearing_caution || '-'}</p>
         ${care.storage_method ? `<h4>보관 방법</h4><p>${care.storage_method}</p>` : ''}`
      : '<p>등록된 소재/관리 정보가 없습니다.</p>';

    const shipping = product.product_shipping_policies;
    $('[data-panel="shipping"]').innerHTML = shipping
      ? `<h4>배송비</h4><p>${shipping.shipping_fee > 0 ? formatWon(shipping.shipping_fee) : '무료배송'}${shipping.free_shipping_threshold ? ` (${formatWon(shipping.free_shipping_threshold)} 이상 구매 시 무료배송)` : ''}</p>
         <h4>배송 안내</h4><p>${shipping.estimated_delivery || '-'}</p>
         <h4>교환 안내</h4><p>${shipping.exchange_policy || '-'}</p>
         <h4>반품 안내</h4><p>${shipping.return_policy || '-'}</p>
         <h4>환불 안내</h4><p>${shipping.refund_policy || '-'}</p>`
      : '<p>등록된 배송/교환 정보가 없습니다.</p>';
  }

  function renderGuide(guides) {
    if (!guides.length) return; // 실제 등록된 착용가이드가 없으면 섹션 자체를 숨김 (임의 생성 금지)
    $('#pdpGuideSection').hidden = false;
    const wrap = $('#pdpGuideSteps');
    wrap.innerHTML = '';
    guides.forEach(g => {
      const step = document.createElement('div');
      step.className = 'pdp-guide-step';
      const media = g.media_type === 'video'
        ? `<video src="${g.media_url}" muted loop playsinline autoplay></video>`
        : `<img src="${g.media_url}" alt="${g.title || ''}">`;
      step.innerHTML = `${media}<p>${g.step_number ? `0${g.step_number}. ` : ''}${g.title || ''}</p>`;
      wrap.appendChild(step);
    });
  }

  function renderReviews(reviews, stats) {
    $('#pdpReviewsTitle').textContent = stats && stats.review_count > 0
      ? `이 상품의 후기 (★ ${stats.average_rating} · ${stats.review_count}건)`
      : '이 상품의 후기';
    const grid = $('#pdpReviews');
    if (!reviews.length) {
      grid.innerHTML = '<p class="pdp-reviews-empty">아직 등록된 후기가 없습니다. 첫 구매 후기를 남겨보세요!</p>';
      return;
    }
    grid.innerHTML = '';
    reviews.forEach(r => {
      const full = Math.floor(r.rating);
      const half = r.rating % 1 !== 0;
      const stars = '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
      const tags = (r.review_tags || []).map(t => '#' + t.tag).join(' ');
      const date = new Date(r.created_at).toLocaleDateString('ko-KR');
      const media = (r.review_images || []).map(file => /\.(mp4|webm|mov)(\?|$)/i.test(file.image_url)
        ? `<video class="review-card__media" src="${file.image_url}" controls muted playsinline></video>`
        : `<img class="review-card__media" src="${file.image_url}" alt="${file.alt_text || '구매 후기 이미지'}">`).join('');
      const div = document.createElement('div');
      div.className = 'review-card';
      div.innerHTML = `
        <div class="review-card__head"><span>${r.nickname}</span><span>${date}</span></div>
        <div class="review-card__rating">${stars} ${r.rating}</div>
        ${media ? `<div class="review-card__media-grid">${media}</div>` : ''}
        <p class="review-card__text">"${r.content}"</p>
        <div class="review-card__tags">${tags}</div>`;
      grid.appendChild(div);
    });
  }
})();
