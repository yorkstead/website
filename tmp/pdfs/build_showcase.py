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
MEDIA=ROOT/'public/media/sic'
OUT=ROOT/'output/pdf/sic-pizza-pos-showcase.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','C:/Windows/Fonts/arialbd.ttf'))
W,H=1080,675
BG='#100C09'; PANEL='#211710'; INK='#FFF7ED'; MUTED='#C2B4A6'; ORANGE='#FF791D'; LINE='#453125'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('SIC Pizza POS | One live table. Everyone sees what they need.')
c.setAuthor('Yorkstead Systems')
c.setSubject('Restaurant operating platform showcase using SIC Pizza demonstration screens')

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
def foot(n,detail='SIC Pizza demonstration | Sample restaurant data'):
 rect(48,635,984,1,LINE);text('YORKSTEAD SYSTEMS',48,650,9,INK,'Bold');text(detail,235,650,9,MUTED);text(f'{n:02d} / 09',982,650,9,MUTED)
def end(n,detail=None):
 foot(n,detail or 'SIC Pizza demonstration | Sample restaurant data');c.showPage()
def shot(name,x,y,w,h,crop=None):
 im=Image.open(MEDIA/name); iw,ih=im.size
 box=crop or (0,0,iw,ih);l,t,r,b=box;bw,bh=r-l,b-t
 scale=min(w/bw,h/bh);dw,dh=bw*scale,bh*scale
 xx=x+(w-dw)/2;yy=y+(h-dh)/2
 rect(xx-3,yy-3,dw+6,dh+6,LINE,7)
 c.saveState();p=c.beginPath();p.rect(xx,H-yy-dh,dw,dh);c.clipPath(p,stroke=0)
 c.drawImage(ImageReader(im),xx-l*scale,H-yy-ih*scale+t*scale,iw*scale,ih*scale,mask='auto');c.restoreState()
def block(title,body,x,y,w=270):
 text(title,x,y,17,INK,'Bold');para(body,x,y+29,w,13)
def link(s,x,y,url,size=14):
 text(s,x,y,size,ORANGE,'Bold');c.linkURL(url,(x,H-y-size-4,x+pdfmetrics.stringWidth(s,'Bold',size),H-y+3),relative=0)

# 1 - cover
base();label('Yorkstead Systems / Product showcase',48,44)
text('SIC PIZZA',48,89,58,font='Bold');text('POS + Restaurant OS',48,158,24,ORANGE,'Bold')
para('One live table.<br/>Everyone sees<br/>what they need.',48,230,430,36,INK,42)
para('A connected restaurant workflow for servers, guests, kitchen teams, and managers.',48,382,385,18)
link('Explore pos.yorkstead.com',48,490,'https://pos.yorkstead.com',17)
para('Interactive platform demonstration<br/>Featuring the fictional SIC Pizza Co. restaurant',48,531,400,11)
shot('floor.png',487,80,550,389,(515,65,2770,1510))
shot('phone-view.png',822,326,135,286,(0,50,875,2010))
rect(507,489,276,81,PANEL,10);label('Built around service',525,502)
para('From the first request to the final check.',525,523,233,15,INK)
end(1)

# 2
head('01 / The connected floor','See the room. Know where to go.','The floor view brings table stage, diners, open requests, kitchen activity, and balance into one place.')
shot('floor.png',355,186,677,420,(930,300,2740,1450))
block('A table is a live session','Orders, people, requests, and payment state stay attached to the table throughout service.',48,204)
block('Focus the floor','Move between all tables, tables needing attention, and your own section. Filter by dining area.',48,326)
block('Follow the service journey','Seated → ordering → entrees → check → paying. The current stage gives the team shared context.',48,448)
end(2)

# 3
head('02 / Tableside + guest ordering','Keep every item connected to its diner.','A detailed table workspace joins ordering, guest proposals, kitchen status, service tasks, and the split bill.')
shot('tablet-view.png',48,190,343,416,(35,190,1735,1990))
block('Order with context','Configured items show modifiers, course, station, and diner ownership. Shared items remain visible as shared.',422,197,280)
block('Guests can participate','The guest web experience supports joining a table and proposing items. Staff approval keeps submissions under server control.',422,325,280)
block('Service stays in view','Guest requests and course pacing sit alongside the order, so the next action is visible without losing table context.',422,467,280)
shot('guest.png',752,206,270,300,(1360,335,2310,1375))
para('Guest join screen<br/>Illustrative table QR from the supplied screenshot.',767,525,239,11)
end(3)

# 4
head('03 / Attention + priorities','Turn requests into visible next actions.','A shared attention queue tracks service work; Do This Next highlights rules-based operational priorities.')
shot('queue.png',48,184,493,324,(930,310,2730,1500))
shot('do-this-next.png',566,184,466,324,(930,290,2730,1540))
block('Claim it. Track it. Complete it.','See request age, urgency, and ownership. Refills, drink reorders, food issues, and checks become explicit work.',48,530,465)
block('Make the next move clear','Suggestions turn current table conditions into focused actions. The recommendation engine uses rules, not an AI model.',566,530,456)
end(4)

# 5
head('04 / Kitchen + course pacing','Keep production aligned with the table.','The kitchen display separates work by station while keeping each item connected to its table and course.')
shot('kitchen.png',344,191,688,333,(925,295,2740,1175))
block('Route by station','Pizza, bar, prep, and other configured stations see the work relevant to them.',48,208)
block('Control the pace','Hold or fire courses and see their current state alongside table activity.',48,328)
block('Coordinate the handoff','Track kitchen progress and use the expo view to coordinate readiness across stations.',48,448)
rect(344,549,688,62,PANEL,8);para('The service idea: one order can involve several stations without losing the table-level picture.',363,566,649,14,INK)
end(5)

# 6
head('05 / The pre-split check','Split ownership before the bill arrives.','The live demo tracks individual and shared items, allocated tax, paid amounts, and each diner\'s remaining balance.')
label('Example verified in the live demo',48,196)
rect(48,228,296,280,PANEL,12);text('TABLE 11',69,249,13,ORANGE,'Bold')
text('$31.12',69,286,47,font='Bold');text('Total including sample tax',69,346,13,MUTED)
para('Garlic knots: $8.00 shared<br/>Pepperoni pizza: $20.75 for Alex<br/>Subtotal: $28.75<br/>Sample tax: $2.37',69,389,254,14)
for x,name,amount,body in [(373,'ALEX / SEAT 1','$26.79','Pizza: $20.75<br/>Shared knots: $4.00<br/>Allocated tax: $2.04'),(716,'SAM / SEAT 2','$4.33','Individual items: $0.00<br/>Shared knots: $4.00<br/>Allocated tax: $0.33')]:
 rect(x,228,316,280,PANEL,12);text(name,x+22,250,13,ORANGE,'Bold');text(amount,x+22,294,43,font='Bold');para(body,x+22,374,270,16)
para('Pay by diner or settle the remaining table balance. The demo also presents tip presets; the amounts above exclude tips.',48,541,950,16,INK)
para('Illustrative check, not a receipt. Payments are simulated; no live card processing is demonstrated.',48,594,950,11)
end(6,'Live-demo example checked August 31, 2026 | Simulated payments')

# 7
head('06 / Manager visibility + analytics','Spot the issue. Understand the pattern.','Manager views surface service exceptions; event-derived analytics connect activity to timing and operational follow-through.')
shot('phone-view.png',48,190,173,405,(0,50,875,2010))
shot('manager.png',252,191,378,273,(930,300,2735,1600))
shot('analytics.png',659,191,373,273,(925,300,2740,1650))
block('Manage the active shift','Monitor floor health, outstanding requests, and tables needing intervention. A phone layout keeps the same operational focus portable.',252,490,363)
block('Learn from the service trail','Explore timing across greeting, kitchen work, runner delivery, and table turns. Sample metrics illustrate the workflow, not measured customer results.',659,490,363)
end(7)

# 8
head('07 / Handoffs + history','Change the server. Keep the context.','A shift handoff summarizes active tables and unresolved work, while the event trail records how the session changed.')
shot('handoff.png',48,185,426,361,(945,120,2330,1820))
shot('audit-trail.png',516,185,516,361,(920,295,2720,1560))
block('A structured shift handoff','Review table state, balances, and open requests before transferring responsibility.',48,564,426)
block('A traceable table history','Inspect recorded events for orders, tasks, kitchen progress, and payment activity.',516,564,516)
end(8)

# 9
head('Explore / Discuss / Adapt','Take a walk through the demo.','SIC Pizza is the demonstration restaurant. The broader platform is designed around configurable restaurant workflows.')
link('pos.yorkstead.com',48,197,'https://pos.yorkstead.com',28)
para('Choose SIC Pizza Co. and use the dev PIN displayed on the sign-in screen. Explore Table 11, the floor, kitchen, Manager Hub, and Service Analytics.',48,248,570,17,INK)
rect(48,345,617,141,PANEL,10);label('A starting point for your restaurant',69,364)
para('Discuss your floor plan, menu modifiers, kitchen stations, staff roles, guest experience, and checkout requirements.',69,391,570,16,INK)
link('Start a conversation with Yorkstead',69,450,'https://yorkstead.com/#contact',13)
qrw=qr.QrCodeWidget('https://pos.yorkstead.com');bounds=qrw.getBounds();d=Drawing(145,145,transform=[145/(bounds[2]-bounds[0]),0,0,145/(bounds[3]-bounds[1]),0,0]);d.add(qrw)
rect(829,188,166,166,'#FFFFFF',10);renderPDF.draw(d,c,839,H-198-145)
text('SCAN TO OPEN THE DEMO',818,365,11,ORANGE,'Bold')
para('<b>Demonstration boundaries</b><br/>The reviewed app uses in-memory session data, a development PIN, and simulated payments. Durable storage, production authentication, payment gateways, hardware integration, and cross-device synchronization need separate implementation or verification before a restaurant rollout.',711,411,321,12)
para('<b>Sources &amp; scope</b>  SIC Pizza project README, domain models, and UI components; supplied screenshots in public/media/sic; live app at pos.yorkstead.com reviewed August 31, 2026. Screenshots show synthetic restaurant data and are selectively framed for readability. Features described are demo capabilities, not a production-readiness certification.',48,524,617,10.5)
end(9,'Product showcase | August 2026 | yorkstead.com')
c.save()
print(OUT)
