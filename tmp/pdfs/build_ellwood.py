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
MEDIA=ROOT/'public/media/projects/ellwood-flow'
OUT=ROOT/'output/pdf/ellwood-flow-showcase.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Body','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','C:/Windows/Fonts/arialbd.ttf'))
W,H=1080,675
BG='#0C1E2E'; PANEL='#183149'; INK='#F7FAFC'; MUTED='#B7C7D5'; ORANGE='#FF852D'; LINE='#365067'
c=canvas.Canvas(str(OUT),pagesize=(W,H))
c.setTitle('Ellwood Flow | From release to shipment.')
c.setAuthor('Yorkstead Systems')
c.setSubject('Manufacturing workflow showcase using supplied Elward Flow application screens')

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
def foot(n,detail='Ellwood Flow | Screens shown with fictional project data'):
 rect(48,635,984,1,LINE);text('YORKSTEAD SYSTEMS',48,650,9,INK,'Bold');text(detail,235,650,9,MUTED);text(f'{n:02d} / 10',982,650,9,MUTED)
def end(n,detail=None):
 foot(n,detail or 'Ellwood Flow | Screens shown with fictional project data');c.showPage()
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

def feature(n,k,title,sub,img,items,crop):
 head(k,title,sub)
 shot(img,350,190,682,420,crop)
 for i,(a,b) in enumerate(items):block(a,b,48,204+i*127,271)
 end(n)

base();label('Yorkstead Systems / Product showcase',48,44)
text('ELLWOOD',48,91,54,font='Bold');text('FLOW',48,151,54,ORANGE,'Bold')
para('From release<br/>to shipment.<br/>One connected path.',48,254,448,34,INK,41)
para('Production release control and shop-floor operations for architectural panel manufacturing.',48,411,410,18)
link('Built around the way your shop works',48,520,'https://yorkstead.com/#contact',14)
para('Product walkthrough | August 2026',48,562,400,11)
shot('dashboard-desktop.png',505,91,526,344,(0,0,1440,900))
shot('scan-mobile.png',856,327,132,282,(0,0,390,844))
rect(508,477,313,96,PANEL,10);label('Keep the handoffs connected',526,493)
para('Engineering. Materials. Production. Quality. Shipping.',526,517,274,16,INK)
end(1)

head('01 / Release control','Give the shop one current release.','Connect the job, revision, panel marks, controlled documents, and unresolved blockers before work moves forward.')
shot('dashboard-desktop.png',350,187,682,418,(275,80,1430,790))
block('Establish the release','Bring ZIP/PDF files and structured panel takeoffs into a controlled record. Preserve originals and publish revisions.',48,203)
block('Keep the right files close','Drawings, CNC files, and complete release packets have distinct actions in the active-release workspace.',48,334)
block('Make readiness visible','See the current revision, department progress, panel marks, and owned exceptions together.',48,465)
end(2)

feature(3,'02 / Material readiness','Know what is available before work starts.','Inventory connects release demand to stock, allocations, receiving, and material movements.','inventory-desktop.png',[
 ('Separate stock from availability','Distinguish what is on hand, what is already committed, and what is available for the next release.'),
 ('Reserve against real demand','Allocate material to release needs, then record issues and returns as work progresses.'),
 ('Keep a transaction trail','Receiving, adjustments, scrap, and blind cycle counts support an accountable inventory record.')],(270,75,1435,670))

head('03 / Production + scanning','Put the next valid action at the station.','Supervisors plan department work. Operators scan a mark and act within its current revision and allowed routing.')
shot('production-tablet.png',48,186,520,384,(200,65,1020,670))
shot('scan-mobile.png',617,186,184,411,(0,0,390,844))
block('Direct the work','Department queues, workstation assignments, first-off inspections, and downtime records give production a shared operating view.',829,203,202)
block('Protect the revision','The scanner checks revision status and blocks obsolete marks from silently moving through production.',829,400,202)
para('Tablet planning view and phone scan station. Screenshots show fictional work and example quantities.',48,590,740,11)
end(4)

feature(5,'04 / Quality + remake control','Keep the exception attached to the work.','Inspection results, quality holds, rework, and remakes stay linked to the panel and release.','quality-desktop.png',[
 ('Record the disposition','Capture inspection measurements and decisions such as pass, hold, rework, remake, or scrap.'),
 ('Control the hold','Require an authorized release and a recorded reason when a quality issue is cleared.'),
 ('Preserve remake lineage','Track internal and engineering-related remakes back to their source marks, with configurable numbering.')],(270,75,1435,750))

feature(6,'05 / Pallets + staging','Build the load from traceable panel marks.','Pallet construction connects finished work to a physical container and its shipping handoff.','pallets-desktop.png',[
 ('Group work deliberately','Select the release and elevation, then add panel marks to a named pallet.'),
 ('Check the configured limits','Review pallet height, weight, and material compatibility as the stack is built.'),
 ('Make the handoff explicit','Complete and stage the pallet, then export a packing slip with its recorded contents.')],(270,75,1435,685))

feature(7,'06 / Shipping','Carry the record all the way to dispatch.','Plan shipments, assign staged pallets, and keep the outbound record connected to the release.','shipping-desktop.png',[
 ('Plan the shipment','Record the carrier, trailer, destination, and pallets assigned to the load.'),
 ('Review before dispatch','Inspect staged contents and configured load limits before authorizing the shipment.'),
 ('Close the loop','Dispatch updates the shipping record and supports a bill-of-lading CSV for the outbound handoff.')],(270,75,1435,680))

feature(8,'07 / Operational reporting','See the flow behind the finished product.','Reporting brings production activity, yield, scrap, and logistics measures into a common review surface.','reports-desktop.png',[
 ('Review the department picture','Use station-level throughput and cycle information to identify where work needs attention.'),
 ('Connect quality to output','Bring yield, scrap, and remake activity into the same operational conversation.'),
 ('Share a consistent record','Export report data for planning and review. Displayed metrics are examples, not measured customer results.')],(270,75,1435,730))

head('08 / Access + accountability','Give each action an owner and a history.','Authenticated access, role permissions, and audit records support controlled operational changes.')
shot('admin-desktop.png',48,185,560,290,(270,75,1435,680))
shot('sign-in-desktop.png',656,185,376,290,(190,125,1245,750))
block('Roles shaped around responsibilities','Administration supports user access and permissions for operational work. Audit history records who changed what and when.',48,505,555)
block('A workspace for authorized teams','The app uses authenticated access. Identity setup, deployment configuration, and recovery procedures remain part of rollout planning.',656,505,370)
end(9)

head('Explore / Discuss / Adapt','Start with the handoff that costs you time.','Use this workflow as a starting point for a focused conversation about your manufacturing operation.')
label('One connected operations chain',48,197)
stages=[('01','Release'),('02','Materials'),('03','Production'),('04','Quality'),('05','Pallets'),('06','Shipping')]
for i,(num,name) in enumerate(stages):
 x=48+i*164;rect(x,225,151,76,PANEL,8);label(num,x+15,238);text(name,x+15,261,16,INK,'Bold')
rect(48,336,600,143,PANEL,10);label('Discuss your workflow',68,354)
para('Map the release package, revision rules, station routing, material constraints, quality decisions, and shipping requirements before choosing the first implementation milestone.',68,381,559,15,INK)
link('Connect with Yorkstead Systems',68,449,'https://yorkstead.com/#contact',13)
para('<b>Current scope</b><br/>The project describes an integrated operational MVP approaching internal-pilot readiness. Production acceptance, deployment setup, backup/restore rehearsal, data migration, and integrations require environment-specific validation.',703,337,328,12)
para('<b>Live access check</b><br/>The recorded Ellwood and Elward Flow addresses returned Deployment not found on August 31, 2026. This booklet uses verified project sources and supplied screenshots; it does not certify current live operation.',703,484,328,11)
para('<b>Sources &amp; presentation notes</b><br/>Elward Flow project README, release lifecycle guide, and service implementation; screenshots from public/media/projects/ellwood-flow, matched to the project\'s August 22, 2026 fictional-data captures. Original Elward app branding is retained in the screenshots; Ellwood Flow follows the current portfolio title. No time, cost, or quality improvement is claimed as measured.',48,514,600,10.5)
end(10,'Product showcase | August 2026 | yorkstead.com')
c.save()
print(OUT)


