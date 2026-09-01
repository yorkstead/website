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
MEDIA=ROOT/'tmp/pdfs/ops-media'
OUT=ROOT/'output/pdf/yorkstead-operations-showcase.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','C:/Windows/Fonts/arialbd.ttf'))
W,H=1080,675
BG='#070C13'; PANEL='#111E2A'; INK='#F1F7FB'; MUTED='#B0C0CE'; ORANGE='#21C5E8'; LINE='#284354'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Yorkstead Operations | Work connected from quote to delivery.')
c.setAuthor('Yorkstead Systems')
c.setSubject('Yorkstead Operations product and public demo showcase')

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
def foot(n,detail='Yorkstead Operations | Synthetic demo examples'):
 rect(48,635,984,1,LINE);text('YORKSTEAD SYSTEMS',48,650,9,INK,'Bold');text(detail,235,650,9,MUTED);text(f'{n:02d} / 09',982,650,9,MUTED)
def end(n,detail=None):
 foot(n,detail or 'Yorkstead Operations | Synthetic demo examples');c.showPage()
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

base();label('Yorkstead Systems / Product showcase',48,44)
text('YORKSTEAD',48,96,48,font='Bold');text('OPERATIONS',48,153,40,ORANGE,'Bold')
para('Work connected.<br/>From the first quote<br/>to the final handoff.',48,247,455,32,INK,40)
para('A modular operations platform for manufacturing, fabrication, and service teams.',48,408,398,18)
link('Explore ops.yorkstead.com/demo',48,519,'https://ops.yorkstead.com/demo',16)
para('Platform overview + four live public demo scenarios',48,562,420,11)
shot('demo.png',513,97,519,300,(15,87,711,432))
rect(513,432,519,154,PANEL,10);label('One operational conversation',533,451)
para('What is the job?<br/>What is holding it up?<br/>Who owns the next step?',533,480,465,23,INK,31)
end(1)

head('01 / Platform overview','Give every handoff a shared record.','The platform organizes work around jobs, travelers, materials, quality, and delivery - with supporting records close by.')
cards=[('QuoteFlow + Jobs','Estimate scope, review cost and margin, and organize the canonical work order.'),('Shopfloor','Dispatch digital travelers, track station work, and record blockers and completed steps.'),('Inventory + Purchasing','Connect stock movements, job demand, shortages, purchase orders, and receipts.'),('Quality + Maintenance','Track inspections, non-conformance, equipment issues, and return-to-service work.'),('Packaging + Shipping','Build containers, check contents, and connect sealed work to an outbound manifest.'),('Analytics + Activity','Review operational signals and trace important changes back to their records.')]
for i,(a,b) in enumerate(cards):
 x=48+(i%3)*336;y=199+(i//3)*189;rect(x,y,312,164,PANEL,10);label(f'{i+1:02d}',x+20,y+17);text(a,x+20,y+43,17,INK,'Bold');para(b,x+20,y+78,272,14)
para('Module descriptions are based on the reviewed project. Authenticated end-to-end operation was not verified for this booklet.',48,597,978,11)
end(2)

head('02 / Manufacturing example','Follow the quote-to-ship story.','Front Range Precision Manufacturing demonstrates high-mix fabrication with clear roles and four workflow checkpoints.')
shot('manufacturing-detail.png',350,193,682,398,(20,65,1230,710))
block('Start with the commercial scope','The scenario links a facade-panel RFQ to material, cost, price, and margin context.',48,207)
block('Move through the traveler','Laser cutting, brake forming, welding, and coating illustrate a routed production sequence.',48,339)
block('Verify before dispatch','First-article inspection and an NCR checkpoint lead into pallet and shipping context.',48,471)
end(3)

head('03 / Facility-service example','Make recurring service work visible.','Summit Facility Services demonstrates site-based checklists, proof-of-work summaries, consumables, and client signoff.')
shot('facility-detail.png',350,193,682,398,(20,65,1230,710))
block('Keep the site in context','Client locations, work-order identity, shift timing, and crew responsibility frame the work.',48,207)
block('Track the checklist','The scenario shows task completion alongside evidence summaries and verification fields.',48,339)
block('Close with an explicit signoff','A named client signoff and consumables summary illustrate a structured service closeout.',48,471)
end(4)

head('04 / Sign-fabrication example','Carry revision context into the field.','Mile High Signworks demonstrates a path from approved artwork through shop fabrication and installation closeout.')
shot('signworks-detail.png',350,193,682,398,(20,65,1230,710))
block('Approve the artwork','The example establishes a named drawing revision and client approval before fabrication.',48,207)
block('Sequence the shop work','Routing, bending, wiring, finishing, and crating are presented as connected stages.',48,339)
block('Prepare the site handoff','Permit status, rigging assignment, installation checks, and final signoff stay in the scenario record.',48,471)
end(5)

head('05 / Mobile-service example','Keep the technician and customer aligned.','Peak Mobile Detail demonstrates a service checklist, inspection values, evidence summaries, and approved add-ons.')
shot('mobile-detail.png',350,193,682,398,(20,65,1230,710))
block('Start with the service record','Vehicle, customer, technician, and assigned rig give the job a clear identity.',48,207)
block('Document the work','Checklist progress and measurement fields illustrate a repeatable execution record.',48,339)
block('Make scope changes explicit','Add-on consent and an itemized total lead to a clearly labeled simulated payment step.',48,471)
end(6,'Yorkstead Operations | Synthetic data and simulated payments')

head('06 / Documents + knowledge','Keep instructions and evidence beside the work.','Supporting modules extend the operational record beyond status updates and quantities.')
for i,(a,b,note) in enumerate([
 ('Job Packets','Review source documents, extracted entities, revision decisions, and department bundles.','Human review remains essential; production OCR is not verified.'),
 ('File Vault','Organize controlled files within the organization and its operational workflow.','Storage availability and malware scanning require deployment verification.'),
 ('KnowHow','Maintain procedures with a draft, review, and publication path.','Treat controlled source instructions as the authority for execution.')]):
 x=48+i*336;rect(x,211,312,308,PANEL,10);label(f'{i+1:02d} / Supporting record',x+21,234);text(a,x+21,274,24,INK,'Bold');para(b,x+21,321,268,15);para(note,x+21,432,268,12)
para('The purpose: make the current instructions, supporting files, and review decisions easier to find at the handoff.',48,556,968,18,INK)
end(7,'Yorkstead Operations | Project-backed module overview')

head('07 / Access + demonstration boundaries','A useful demo. A clear production boundary.','Public scenarios help explain the workflows. They are not evidence that every authenticated production path is ready.')
block('Explore safely','The public hub labels its scenarios DEMO MODE // SYNTHETIC DATA. Use fictional information only when evaluating it.',48,208,430)
block('Keep the organization clear','Operational records belong to an authenticated workspace. Confirm the active organization and role before making changes.',48,345,430)
block('Keep approvals meaningful','Permissions, revision decisions, inspections, and dispatch actions should follow the responsibilities of the team doing the work.',48,482,430)
rect(538,195,494,410,PANEL,12);label('What this booklet verifies',560,218)
para('The public demo hub loaded at ops.yorkstead.com/demo, and all four scenario views were inspected and captured on August 31, 2026.',560,248,449,16,INK)
label('What remains separate',560,341)
para('The QuoteFlow module link redirected to sign-in. Authenticated module transactions, delivery integrations, storage readiness, production isolation, and reset behavior were not tested here.',560,370,449,14)
para('Displayed names, prices, performance metrics, signoffs, and evidence counts are synthetic examples. They are not customer results or proof of completed real-world work.',560,490,449,13)
end(8)

head('Explore / Discuss / Adapt','Find the workflow that looks like yours.','Choose a scenario, follow the handoffs, and identify the records and approvals your own team needs.')
link('ops.yorkstead.com/demo',48,207,'https://ops.yorkstead.com/demo',29)
para('Manufacturing. Facility services. Sign fabrication. Mobile service.<br/><br/>Start with the public walkthrough, then arrange an authenticated product review for the modules relevant to your operation.',48,269,600,18,INK)
rect(48,425,615,99,PANEL,10);label('Build around the real work',69,444);link('Discuss your operation with Yorkstead',69,478,'https://yorkstead.com/#contact',17)
q=qr.QrCodeWidget('https://ops.yorkstead.com/demo');b=q.getBounds();d=Drawing(172,172,transform=[172/(b[2]-b[0]),0,0,172/(b[3]-b[1]),0,0]);d.add(q)
rect(795,204,197,197,'#FFFFFF',10);renderPDF.draw(d,c,807,H-216-172);label('Scan to explore the demo',791,421)
para('Operations is a separate application from the public Yorkstead website and its private Command Center.',727,478,306,13)
para('<b>Sources</b>  Live public demo at ops.yorkstead.com/demo, captured August 31, 2026; Yorkstead Product User Guide; Operations README, Visual System, and Production Readiness matrix. Screens are cropped for readability. Project documentation informs module descriptions; it does not establish current hosted readiness.',48,559,971,10.5)
end(9,'Product showcase | August 2026 | yorkstead.com')
c.save();print(OUT)


