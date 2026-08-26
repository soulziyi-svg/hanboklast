from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import textwrap

W, H = 860, 1100
ROOT = Path(__file__).resolve().parent
IMG = ROOT / "img" / "콘텐츠1" / "평상복" / "달빛하얀소복"
OUT = ROOT / "달빛하얀소복_상세페이지"
OUT.mkdir(exist_ok=True)

FILES = {
    "dress": IMG / "달빛하얀소복01.png",
    "day": IMG / "달빛하얀소복02.png",
    "night": IMG / "달빛하얀소복03.png",
    "head": IMG / "달빛하얀소복족두리.png",
    "shoes": IMG / "달빛하얀소복꽃신.png",
    "ornament": IMG / "달빛하얀소복노리개.png",
    "pin": IMG / "달빛하얀소복비녀.png",
}

FONT_REG = r"C:\Windows\Fonts\NotoSansKR-VF.ttf"
FONT_SERIF = r"C:\Windows\Fonts\NotoSerifKR-VF.ttf"

COL = {
    "ivory": "#F8F5EF", "paper": "#FFFCF7", "beige": "#D8C9B5",
    "beige2": "#EEE7DC", "ink": "#2D2925", "muted": "#77716B",
    "silver": "#B7C0C5", "blue": "#DDEAF0", "white": "#FFFFFF",
    "line": "#DED7CE", "dark": "#57514B"
}

def font(size, serif=False):
    return ImageFont.truetype(FONT_SERIF if serif else FONT_REG, size)

def base(color=None):
    return Image.new("RGB", (W,H), color or COL["ivory"])

def rounded(draw, box, radius=28, fill=COL["paper"], outline=None, width=1):
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=width)

def label(draw, text, xy=(64,64), fill=COL["muted"]):
    draw.text(xy, text, font=font(18), fill=fill)

def title(draw, text, xy=(64,105), size=50, fill=COL["ink"], serif=False, spacing=8):
    draw.multiline_text(xy, text, font=font(size, serif), fill=fill, spacing=spacing)

def body(draw, text, xy, size=24, fill=COL["muted"], spacing=9):
    draw.multiline_text(xy, text, font=font(size), fill=fill, spacing=spacing)

def fit_image(path, size, crop=False, anchor=(0.5,0.5)):
    im = Image.open(path).convert("RGB")
    if crop:
        sw, sh = im.size; tw, th = size
        scale=max(tw/sw,th/sh); nw,nh=int(sw*scale),int(sh*scale)
        im=im.resize((nw,nh),Image.Resampling.LANCZOS)
        x=int((nw-tw)*anchor[0]); y=int((nh-th)*anchor[1])
        return im.crop((x,y,x+tw,y+th))
    im.thumbnail(size, Image.Resampling.LANCZOS)
    return im

def paste_round(canvas, path, box, radius=28, crop=True, anchor=(0.5,0.5)):
    x1,y1,x2,y2=box; size=(x2-x1,y2-y1)
    im=fit_image(path,size,crop,anchor)
    layer=Image.new("RGB",size,COL["paper"])
    layer.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
    mask=Image.new("L",size,0); md=ImageDraw.Draw(mask); md.rounded_rectangle((0,0,*size),radius,fill=255)
    canvas.paste(layer,(x1,y1),mask)

def save(im, n, name):
    p=OUT/f"{n:02d}_{name}.png"; im.save(p, quality=96); return p

# 01 Hero
im=base(); d=ImageDraw.Draw(im)
paste_round(im,FILES["night"],(0,0,W,H),0,True,(.5,.48))
overlay=Image.new("RGBA",(W,H),(0,0,0,0)); od=ImageDraw.Draw(overlay)
od.rectangle((0,0,W,350),fill=(15,24,38,112)); od.rectangle((0,810,W,H),fill=(15,24,38,70))
im=Image.alpha_composite(im.convert("RGBA"),overlay).convert("RGB"); d=ImageDraw.Draw(im)
d.text((60,62),"입어봄",font=font(20),fill="#F6F2EA")
d.text((56,105),"달빛하얀소복",font=font(64,True),fill="#FFFFFF")
d.multiline_text((60,205),"빛을 머금은 듯 은은하게,\n한 폭의 달빛처럼",font=font(31),fill="#F6F2EA",spacing=10)
save(im,1,"히어로")

# 02 Reviews
im=base(COL["paper"]); d=ImageDraw.Draw(im); label(d,"CUSTOMER REVIEW")
title(d,"입는 순간 느껴지는\n차분한 아름다움",size=48)
d.text((64,245),"4.9",font=font(90,True),fill=COL["ink"]); d.text((220,292),"/ 5",font=font(28),fill=COL["muted"])
d.text((64,350),"★★★★★",font=font(28),fill="#B49B70")
reviews=[("은은한 흰빛이 얼굴까지 맑아 보여 사진이 정말 잘 나왔어요.","01"),("소매와 치마가 자연스럽게 움직여 오래 입어도 편안했어요.","02"),("낮과 밤 조명에서 분위기가 달라 특별한 촬영에 잘 어울려요.","03")]
y=430
for txt,num in reviews:
    rounded(d,(54,y,806,y+155),24,COL["ivory"],COL["line"])
    d.text((82,y+32),num,font=font(20),fill="#B39D81")
    d.multiline_text((130,y+28),txt,font=font(23),fill=COL["ink"],spacing=8)
    y+=178
d.text((64,1028),"※ 평점과 후기는 상세페이지 디자인 시안용 예시입니다.",font=font(16),fill="#99918A")
save(im,2,"리뷰")

# 03 Values
im=base(); d=ImageDraw.Draw(im); label(d,"THREE VALUES")
title(d,"왜 입을수록\n만족스러울까요?",size=48)
cards=[("01","절제된 우아함","부드러운 흰빛과 섬세한 배색이\n차분하고 고급스러운 인상을 전합니다.",FILES["dress"]),("02","선을 살린 편안함","한복의 유려한 선과 자연스러운 움직임을\n함께 담아 다양한 자리에서 편안합니다.",FILES["day"]),("03","빛 속에서 더 아름답게","자연광과 조명 아래 살아나는 실루엣이\n기억하고 싶은 순간을 완성합니다.",FILES["night"])]
y=305
for num,hd,tx,p in cards:
    rounded(d,(52,y,808,y+220),28,COL["paper"],COL["line"])
    paste_round(im,p,(68,y+18,258,y+202),20,True,(.5,.45))
    d.text((288,y+28),num,font=font(22),fill="#B39D81")
    d.text((288,y+65),hd,font=font(31,True),fill=COL["ink"])
    d.multiline_text((288,y+118),tx,font=font(20),fill=COL["muted"],spacing=7)
    y+=242
save(im,3,"핵심가치")

# 04 Point 01
im=base(COL["paper"]); d=ImageDraw.Draw(im); label(d,"POINT 01")
title(d,"화려함보다 오래 남는\n은은한 아름다움",size=49)
body(d,"부드러운 흰빛과 절제된 자수가\n격식 있는 자리에도 차분하게 어우러집니다.",(64,242),23)
paste_round(im,FILES["day"],(48,350,812,1040),30,True,(.5,.45))
save(im,4,"포인트01")

# 05 Point 02
im=base(); d=ImageDraw.Draw(im); label(d,"POINT 02")
title(d,"한복의 선은 그대로,\n움직임은 한결 편안하게",size=48)
body(d,"넉넉한 소매와 풍성한 치마가 움직임을 자연스럽게 따라\n오래 머무는 자리에서도 부담을 덜어줍니다.",(64,242),22)
paste_round(im,FILES["day"],(48,360,812,1038),30,True,(.5,.55))
# one detail circle, cropped from original product image
detail=fit_image(FILES["dress"],(280,280),True,(.53,.40)); mask=Image.new("L",(280,280),0); ImageDraw.Draw(mask).ellipse((0,0,279,279),fill=255)
im.paste(detail,(530,720),mask); ImageDraw.Draw(im).ellipse((530,720,810,1000),outline=COL["paper"],width=10)
save(im,5,"포인트02")

# 06 Point 03
im=base(COL["paper"]); d=ImageDraw.Draw(im); label(d,"POINT 03")
title(d,"햇살 아래도, 달빛 아래도\n선명하게 남는 순간",size=47)
body(d,"웨딩 촬영부터 돌잔치와 가족사진까지,\n빛에 따라 달라지는 표정으로 특별한 날을 완성합니다.",(64,242),22)
paste_round(im,FILES["night"],(48,350,812,1038),30,True,(.5,.47))
save(im,6,"포인트03")

# 07 Comparison
im=base(); d=ImageDraw.Draw(im)
title(d,"왜 입어봄\n달빛하얀소복일까요?",size=48)
rounded(d,(50,250,418,1008),26,COL["paper"],"#CDBB9F",2)
rounded(d,(442,250,810,1008),26,"#ECEAE7",COL["line"],1)
d.text((82,282),"입어봄 달빛하얀소복",font=font(25,True),fill=COL["ink"])
d.text((526,282),"일반 유사 제품",font=font(25,True),fill=COL["dark"])
paste_round(im,FILES["dress"],(78,335,390,610),18,True,(.5,.42))
left=["부드러운 흰빛과\n절제된 자수","유려한 선과\n자연스러운 움직임","빛에 따라 살아나는\n선명한 실루엣","족두리·비녀·꽃신·\n노리개 옵션"]
right=["강한 색 대비나\n장식 중심","활동 시 움직임이\n다소 제한적일 수 있음","조명에 따라 디테일이\n덜 드러날 수 있음","선택 가능한 구성이\n제품마다 다름"]
for i in range(4):
    y=640+i*88
    d.multiline_text((80,y),left[i],font=font(20),fill=COL["ink"],spacing=5)
    d.multiline_text((472,y),right[i],font=font(20),fill=COL["muted"],spacing=5)
    if i<3: d.line((74,y+74,392,y+74),fill=COL["line"],width=1); d.line((466,y+74,786,y+74),fill="#D5D1CC",width=1)
save(im,7,"비교")

# 08 Details
im=base(COL["paper"]); d=ImageDraw.Draw(im)
title(d,"작은 디테일까지\n세심하게",size=50)
details=[("01","은은하게 비치는 자수","가볍게 겹쳐지는 반투명 원단 위로\n섬세한 꽃무늬가 잔잔하게 이어집니다.",FILES["dress"],(.32,.47)),("02","선을 정돈하는 허리 매듭","풍성한 치마와 넓은 소매 사이를\n단정한 매듭이 안정감 있게 잡아줍니다.",FILES["day"],(.5,.47))]
y=290
for num,hd,tx,p,anc in details:
    rounded(d,(52,y,808,y+340),28,COL["ivory"],COL["line"])
    paste_round(im,p,(70,y+20,382,y+320),20,True,anc)
    d.text((420,y+38),num,font=font(22),fill="#B39D81")
    d.text((420,y+82),hd,font=font(29,True),fill=COL["ink"])
    d.multiline_text((420,y+145),tx,font=font(20),fill=COL["muted"],spacing=8)
    y+=365
save(im,8,"디테일")

# 09 Color & Size
im=base(); d=ImageDraw.Draw(im)
title(d,"한눈에 확인하는\n옵션과 사이즈",size=48)
d.text((64,235),"COLOR",font=font(18),fill=COL["muted"]); d.text((64,272),"화이트 · 단일 컬러",font=font(28,True),fill=COL["ink"])
options=[("족두리",FILES["head"]),("비녀",FILES["pin"]),("꽃신",FILES["shoes"]),("노리개",FILES["ornament"])]
for i,(name,p) in enumerate(options):
    x=52+(i%2)*382; y=340+(i//2)*250
    rounded(d,(x,y,x+364,y+226),24,COL["paper"],COL["line"])
    paste_round(im,p,(x+14,y+14,x+350,y+166),16,True,(.5,.5))
    d.text((x+22,y+181),name,font=font(22,True),fill=COL["ink"])
d.text((64,865),"SIZE",font=font(18),fill=COL["muted"])
for i,s in enumerate(["S","M","L"]):
    x=64+i*245; rounded(d,(x,912,x+205,990),20,COL["paper"],COL["line"]); d.text((x+86,932),s,font=font(28,True),fill=COL["ink"])
save(im,9,"옵션사이즈")

# 10 Product Info
im=base(COL["paper"]); d=ImageDraw.Draw(im)
title(d,"구매 전\n꼭 확인하세요",size=50)
paste_round(im,FILES["dress"],(54,270,430,720),22,False)
# dimension arrows without invented values
d.line((84,745,400,745),fill=COL["muted"],width=2); d.polygon([(84,745),(99,737),(99,753)],fill=COL["muted"]); d.polygon([(400,745),(385,737),(385,753)],fill=COL["muted"])
d.text((130,765),"실측 정보는 판매 옵션에서 확인",font=font(18),fill=COL["muted"])
rows=[("브랜드명","입어봄"),("제품명","달빛하얀소복"),("색상 / 옵션","화이트 / 족두리, 비녀, 꽃신, 노리개"),("사이즈","S, M, L")]
y=300
for k,v in rows:
    d.text((480,y),k,font=font(18),fill=COL["muted"]); d.multiline_text((480,y+36),v,font=font(22,True),fill=COL["ink"],spacing=6)
    d.line((480,y+100,802,y+100),fill=COL["line"],width=1); y+=118
rounded(d,(54,860,806,1015),22,COL["ivory"],COL["line"])
d.multiline_text((82,894),"제품 정보에 제공되지 않은 소재 및 실측 수치는\n임의로 표기하지 않았습니다.",font=font(21),fill=COL["ink"],spacing=9)
d.text((64,1040),"측정 위치와 방법에 따라 약간의 오차가 있을 수 있습니다.",font=font(17),fill=COL["muted"])
save(im,10,"제품정보")

# Contact sheet preview
thumbs=[]
for p in sorted(OUT.glob("[0-9][0-9]_*.png")):
    t=Image.open(p).convert("RGB"); t.thumbnail((258,330),Image.Resampling.LANCZOS); thumbs.append((p,t.copy()))
sheet=Image.new("RGB",(860,1420),"#E9E4DC"); sd=ImageDraw.Draw(sheet)
sd.text((38,28),"입어봄 · 달빛하얀소복 상세페이지",font=font(34,True),fill=COL["ink"])
for i,(p,t) in enumerate(thumbs):
    x=38+(i%3)*274; y=90+(i//3)*332
    sheet.paste(t,(x,y)); sd.text((x,y+304),p.stem,font=font(13),fill=COL["dark"])
sheet.save(OUT/"00_전체미리보기.png",quality=95)
print(f"created: {OUT}")
