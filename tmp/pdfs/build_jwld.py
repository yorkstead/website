from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from PIL import Image

ROOT=Path('C:/Users/4twen/dev/yorkstead-website')
MEDIA=ROOT/'public/media/jwld/screenshots'
OUT=ROOT/'output/pdf/jwld-store-showcase.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','C:/Windows/Fonts/arialbd.ttf'))
W,H=1080,675
BG='#0C0B0D'; PANEL='#1D191E'; INK='#FAF6EF'; MUTED='#BBB2BF'; ORANGE='#D6B989'; LINE='#443747'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('jwld.store | Distinctive products. Connected commerce.')
c.setAuthor('Yorkstead Systems')
c.setSubject('JWLD branded commerce product showcase')

def rect(x,y,w,h,col,r=0):
 c.setFillColor(HexColor(col)); c.setStrokeColor(HexColor(col))
 if r:c.roundRect(x,H-y-h,w,h,r,stroke=0,fill=1)
 else:c.rect(x,H-y-h,w,h,stroke=0,fill=1)
def text(s,x,y,size=12,col=INK,font='Body'):
 c.setFillColor(HexColor(col));c.setFont(font,size);c.drawString(x,H-y-size,s)
def para(s,x,y,w,size=14,col=MUTED,leading=None):
 p=Paragraph(s,ParagraphStyle('p',fontName='Body',fontSize=size,leading=leading or size*1.45,textColor=HexColor(col)))
 _,h=p.wrap(w,1000);p.drawOn(c,x,H-y-h);return h
def label(s,x,y):text(s.upper(),x,y,10,ORANGE,'Bold')
def head(k,title,sub):
 base();label(k,48,54);text(title,48,78,34,font='Bold');para(sub,48,127,975,14)
def base():
 rect(0,0,W,H,BG);rect(0,0,W,5,ORANGE)
def foot(n,detail='jwld.store | Commerce showcase'):
 rect(48,635,984,1,LINE);text('YORKSTEAD SYSTEMS',48,650,9,INK,'Bold');text(detail,235,650,9,MUTED);text(f'{n:02d} / 08',982,650,9,MUTED)
def end(n,detail=None):
 foot(n,detail or 'jwld.store | Commerce showcase');c.showPage()
def shot(name,x,y,w,h,crop=None):
 im=Image.open(MEDIA/name).convert('RGB'); im.thumbnail((1600,1600)); iw,ih=im.size
 from io import BytesIO
 encoded=BytesIO(); im.save(encoded,format='JPEG',quality=84,optimize=True); encoded.seek(0)
 box=crop or (0,0,iw,ih);l,t,r,b=box;bw,bh=r-l,b-t
 scale=min(w/bw,h/bh);dw,dh=bw*scale,bh*scale
 xx=x+(w-dw)/2;yy=y+(h-dh)/2
 rect(xx-3,yy-3,dw+6,dh+6,LINE,7)
 c.saveState();p=c.beginPath();p.rect(xx,H-yy-dh,dw,dh);c.clipPath(p,stroke=0)
 c.drawImage(ImageReader(encoded),xx-l*scale,H-yy-ih*scale+t*scale,iw*scale,ih*scale,mask='auto');c.restoreState()
def block(title,body,x,y,w=270):
 text(title,x,y,17,INK,'Bold');para(body,x,y+29,w,13)
def link(s,x,y,url,size=14):
 text(s,x,y,size,ORANGE,'Bold');c.linkURL(url,(x,H-y-size-4,x+pdfmetrics.stringWidth(s,'Bold',size),H-y+3),relative=0)


base();label('Yorkstead Systems / Commerce showcase',48,44)
text('jwld.store',48,105,60,font='Bold')
para('Distinctive products.<br/>Connected commerce.',48,205,460,34,INK,43)
para('A branded buying experience for handmade goods, limited inventory, and custom commissions.',48,335,398,18)
link('Explore jwld.store',48,493,'https://jwld.store',17)
para('Live public screens + source-backed workflow overview',48,545,400,11)
shot('home.png',504,105,528,430)
end(1)

head('01 / Discover','Let the product lead.','A focused collection gives customers a place to browse, compare, and choose without losing the character of the brand.')
shot('catalog.png',355,199,677,396)
block('Merchandise the collection','Product photography, category links, price, and featured pieces establish a clear route into the catalog.',48,204)
block('Make availability visible','Low-stock labels surface scarcity while customers browse. Stock synchronization needs its own transaction tests.',48,340)
block('Keep the brand intact','A restrained dark interface gives colorful handmade products room to stand out.',48,479)
end(2)

head('02 / Choose','Give each piece the detail it deserves.','Product photography, price, materials, care information, and visible availability support the buying decision.')
shot('product.png',355,199,677,396)
block('A specific product record','The detail page connects the piece to its category, description, price, and supporting information.',48,204)
block('A clear next action','Quantity controls and Add to Bag keep the purchase path close to the product.',48,341)
block('Relevant discovery','Related pieces provide a route back into the collection without starting the search over.',48,477)
end(3)

head('03 / Shopping bag','Keep the next step understandable.','A cart drawer keeps the selected piece, quantity, subtotal, shipping note, and checkout entry together.')
shot('bag.png',355,199,677,396)
block('Review before checkout','The bag showed the selected product and subtotal after an Add to Bag action.',48,204)
block('Edit the decision','The public cart supports quantity controls and removal. The sample item was removed after capture.',48,341)
block('Separate intent from payment','A populated bag is not a paid order. No checkout session or payment was initiated for this showcase.',48,477)
end(4)

head('04 / Custom work','Give commissions a path of their own.','Made-to-order work needs a brief before it can become a product or a price.')
shot('custom-form.png',355,199,677,396)
block('Collect the idea','The public form asks for a name, email, description, budget selection, and reference images.',48,204)
block('Turn interest into a brief','Structured intake can reduce scattered messages and give the maker useful context for a quote.',48,341)
block('Keep the boundary clear','The form was inspected without submitting customer information or uploading reference files.',48,477)
end(5)

head('05 / Behind the storefront','Connect the buying journey to the work.','The reviewed source describes more than pages. These implementation paths were not verified through live transactions.')
cards=[('Catalog administration','Product editing, stock, categories, featured status, visibility, and media uploads.'),('Checkout + reservations','Stripe Hosted Checkout and stock reservations, with webhook handling for completed or expired sessions.'),('Order fulfillment','Paid-order records and fulfillment status administration behind authenticated access.'),('Commission handling','Request review, quoted amounts, payment-link storage, workshop status, and configured notifications.'),('Assisted product drafts','A photo-driven product import workflow supports draft catalog fields and images; review is still necessary.'),('Operational ownership','Catalog data, order state, media, and the operator workflow must remain understandable after handoff.')]
for i,(a,b) in enumerate(cards):
 x=48+(i%3)*336;y=193+(i//3)*190;rect(x,y,312,169,PANEL,10);label(f'{i+1:02d}',x+20,y+17);text(a,x+20,y+45,16,INK,'Bold');para(b,x+20,y+80,272,13)
para('Source: jeweled-store README and checkout/webhook source at d502851. Source presence does not prove current hosted readiness.',48,597,978,10)
end(6,'jwld.store | Source-backed capabilities; live admin not inspected')

head('06 / Scope and evidence','A storefront today. A foundation to extend.','The current project represents one brand. A multi-vendor marketplace requires a separately designed operating model.')
block('Observed in the public store','Homepage, catalog, product detail, shopping-bag addition and removal, and the custom-commission form.',48,203,450)
block('Source-backed, not live-tested','Payment webhooks, inventory reservations, fulfillment administration, notifications, and assisted product import.',48,365,450)
block('Additional marketplace scope','Seller onboarding, moderation, commissions, payouts, disputes, and cross-seller fulfillment are not shown as existing features.',559,203,450)
block('No invented business results','No revenue, conversion uplift, sales volume, fulfillment performance, or customer savings are claimed.',559,365,450)
para('Public capture: August 31, 2026. Product prices and availability are snapshots. No purchases, form submissions, or admin mutations were performed.',48,556,973,12)
end(7)

base();label('Explore / Discuss / Adapt',48,53)
text('Build around the way you sell.',48,101,40,font='Bold')
para('A distinctive storefront is the visible part. The useful system connects product information, purchasing intent, custom work, and the handoff to fulfillment.',48,188,890,23,INK,32)
link('Visit the live storefront',48,335,'https://jwld.store',20)
link('Discuss your commerce workflow',48,391,'https://yorkstead.com/#contact',20)
para('Keep what works. Simplify the buying journey. Connect the gaps. Build only what is missing.',48,482,820,19)
para('Sources: jwld.store public homepage, catalog, product detail, cart, and custom form; jeweled-store README and checkout/webhook source, commit d502851. Screens captured for this showcase; no live payment or authenticated admin validation.',48,568,977,10)
end(8,'Yorkstead Systems | Branded commerce and operational workflows')
c.save()
print(OUT,OUT.stat().st_size)

