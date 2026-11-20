package com.flightparty.table;
import java.util.*;
/** Casual shared-target pool. Physics and pockets are simulated on the server.
 * Command = spot * 363600 + power * 3600 + angle, or PLACE_BASE + cueX * 10000
 * + cueY for ball in hand (see pool-place.js). Spot 0 preserves centre hits;
 * 1..8 run clockwise from top: follow, follow-right, right, draw-right, draw,
 * draw-left, left, follow-left.
 * Spin is a bounded rigid-body approximation: vertical-axis side spin and
 * follow/draw are decaying state, not one-shot impulses. This class mirrors
 * dist/table/pool.js constant-for-constant and operation-for-operation; any
 * change to either side must be applied to both and the golden fixtures
 * refreshed in PoolRulesTest and table-pool-spin.test.mjs. */
public final class PoolRules {
 private static final int PENALTY_VISIT=52, PENALTY_READY=1, PENALTY_ACTIVE=2;
 // Ball-in-hand commands keep the cue spot in the same int `position` channel.
 // Mirrors dist/table/pool-place.js: BASE + x(tenths)*STRIDE + y(tenths).
 private static final int PLACE_BASE=1_000_000_000, PLACE_STRIDE=10_000, PLACE_LIMIT=100_000_000;
 private static final String CUE_IN_HAND_FEN="犯规：白球落袋";
 private static final int CUE_MIN=160, CUE_MAX_X=9840, CUE_MAX_Y=4840, CUE_CLEARANCE=330;
 private static final double SHOT_SPEED=.48;
 // Cloth drag: .991 was the speed retained per 8 ms (a .009 loss). Cutting
 // that loss by a quarter twice gives .99325, then .9949375
 // (.00675 -> .0050625 loss); mirrors dist/table/pool.js exactly.
 private static final double DAMP=Math.pow(.9949375,.25);
 private static final double[] SIDE={0,0,Math.sqrt(.5),1,Math.sqrt(.5),0,-Math.sqrt(.5),-1,-Math.sqrt(.5)};
 private static final double[] FOLLOW={0,1,Math.sqrt(.5),0,-Math.sqrt(.5),-1,-Math.sqrt(.5),0,Math.sqrt(.5)};
 private static final double SIDE_K=.020, WZ_DECAY=.9975;
 private static final double TOP_K=.00025, TP_DECAY=.996;
 private static final double E_BALL=.95, MU_BB=.05, SPIN_R=.55, SPIN_T=.22;
 private static final double MU_RAIL=.20, RAIL_SPIN_K=.020, RAIL_WZ_DECAY=.62;
 // Rest threshold. The old .035 let a ball crawl for ~3 s below unit speed,
 // which felt sluggish and made every shot take 4-6 s regardless of power.
 // .2 shortens a shot by 25-34% while preserving slow rolls into pockets:
 // higher values were measured to strand balls in front of the jaws.
 private static final double STOP=.2;
 private static final double[][] HOLES={{0,0},{500,0},{1000,0},{0,500},{500,500},{1000,500}};

 /** Legacy eight-ball entry point kept for the golden fixtures and callers. */
 public static GridRules.State start(){return start("pool");}
 public static GridRules.State start(String game){boolean nine=game.equals("nineball");int[] c=new int[PENALTY_VISIT+1];c[0]=2500;c[1]=2500;c[2]=1;
  if(nine){int[][] rack={{1},{2,3},{4,9,5},{6,7},{8}};for(int col=0;col<rack.length;col++)for(int row=0;row<rack[col].length;row++){int n=rack[col][row];c[n*3]=6500+col*282;c[n*3+1]=2500+(int)Math.round((row-(rack[col].length-1)/2.)*326);c[n*3+2]=1;}}
  else{int[] rack={1,9,2,10,8,3,4,11,5,12,6,13,7,14,15};int k=0;for(int col=0;col<5;col++)for(int row=0;row<=col;row++){int n=rack[k++];c[n*3]=6500+col*282;c[n*3+1]=2500+(int)Math.round((row-col*.5)*326);c[n*3+2]=1;}}
  return new GridRules.State(game,c,1,0,false,0,"",List.of());}

 // 2ms quarter-steps retain original per-second damping; history stays sampled every 16ms.
 public static GridRules.State move(GridRules.State s,int actor,int command){
  if(s.over()||actor!=s.turn())throw new IllegalStateException();
  if(command>=PLACE_BASE)return placeCue(s,actor,command);
  int spinCode=command/363600,shot=command%363600,power=shot/3600,angle=shot%3600;
  if(command<0||spinCode>8||power<1||power>100)throw new IllegalArgumentException();
  double side=SIDE[spinCode],follow=FOLLOW[spinCode];
  double[] x=new double[16],y=new double[16],vx=new double[16],vy=new double[16],wz=new double[16],top=new double[16];
  boolean[] alive=new boolean[16];
  int[] c=Arrays.copyOf(s.cells(),PENALTY_VISIT+1);
  for(int i=0;i<16;i++){x[i]=c[i*3]/10.;y[i]=c[i*3+1]/10.;alive[i]=c[i*3+2]==1;}
  vx[0]=Math.cos(angle*Math.PI/1800)*power*SHOT_SPEED;
  vy[0]=Math.sin(angle*Math.PI/1800)*power*SHOT_SPEED;
  wz[0]=-side*power/100.;top[0]=follow*power/100.;
  var frames=new ArrayList<String>();int pocket=0,firstContact=0;
  var potted=new ArrayList<Integer>();boolean scratch=false,black=false;
  /* Continuous collision detection. Each ball has a linear flight segment
     across one 2 ms macro step, anchored at (sx,sy) at time t0 in [0,1].
     Mirrors dist/table/pool.js operation-for-operation. */
  double[] sx=new double[16],sy=new double[16],dvx=new double[16],dvy=new double[16],t0=new double[16];
  boolean[] dirty=new boolean[16];
  final double CONTACT=32,CONTACT2=CONTACT*CONTACT;
  final int MAX_CCD_EVENTS=64;
  // Resting contacts: near-identical velocities leave a ~1e-4 approach
  // that floating-point noise re-triggers forever at t=0.
  final double MIN_APPROACH=.01;

  for(int step=0;step<4800;step++){
   double speed=0;
   for(int i=0;i<16;i++){
    sx[i]=x[i];sy[i]=y[i];dvx[i]=vx[i];dvy[i]=vy[i];t0[i]=0;dirty[i]=false;
   }
   for(int i=0;i<16;i++)if(alive[i]){
    x[i]+=vx[i]*.25;y[i]+=vy[i]*.25;
    if(PoolGeometry.pocketIndex(x[i],y[i])>=0){
     alive[i]=false;potted.add(i);vx[i]=vy[i]=wz[i]=top[i]=0;
     if(i==0)scratch=true;else if(i==8)black=true;else pocket++;continue;
    }
    var rail=PoolGeometry.resolveCushion(x[i],y[i],vx[i],vy[i]);
    x[i]=rail.x();y[i]=rail.y();vx[i]=rail.vx();vy[i]=rail.vy();
    double railSpeed=rail.normalSpeed();
    if(rail.hit()&&railSpeed>0){
     double nx=rail.nx(),ny=rail.ny(),tx=-ny,ty=nx,vt=vx[i]*tx+vy[i]*ty;
     double kick=RAIL_SPIN_K*railSpeed*wz[i];
     vx[i]+=tx*kick;vy[i]+=ty*kick;
     double friction=Math.min(Math.abs(vt),MU_RAIL*railSpeed);
     if(vt>0){vx[i]-=tx*friction;vy[i]-=ty*friction;}
     else if(vt<0){vx[i]+=tx*friction;vy[i]+=ty*friction;}
     wz[i]*=RAIL_WZ_DECAY;top[i]*=.8;
    }
    double damp=Math.min(.99999,DAMP+TOP_K*top[i]);
    vx[i]*=damp;vy[i]*=damp;
    if(wz[i]!=0){
     double sp=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
     if(sp>1e-9){
      double ox=vx[i],oy=vy[i],k=SIDE_K*wz[i]/sp;
      vx[i]=ox-oy*k;vy[i]=oy+ox*k;
      double ns=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
      if(ns>1e-9){double q=sp/ns;vx[i]*=q;vy[i]*=q;}
     }
     wz[i]*=WZ_DECAY;if(Math.abs(wz[i])<1e-6)wz[i]=0;
    }
    top[i]*=TP_DECAY;if(Math.abs(top[i])<1e-6)top[i]=0;
    double now=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
    if(now<STOP){vx[i]=vy[i]=wz[i]=top[i]=0;}
    speed+=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
   }
   /* Solve every ball pair analytically for its time of impact inside this
      step. Sampling only at the step end let a fast cue ball penetrate up to
      12 units before its contact normal was read, bending thin cuts by up to
      13 degrees. The earliest impact is applied at the exact 2R geometry and
      both balls then travel the remaining fraction with the new velocity. */
   for(int event=0;event<MAX_CCD_EVENTS;event++){
    double bestT=2,bnx=0,bny=0;int bi=-1,bj=-1;
    for(int i=0;i<16;i++)for(int j=i+1;j<16;j++)if(alive[i]&&alive[j]){
     double lo=Math.max(t0[i],t0[j]);
     double r0x=(sx[j]-dvx[j]*.25*t0[j])-(sx[i]-dvx[i]*.25*t0[i]);
     double r0y=(sy[j]-dvy[j]*.25*t0[j])-(sy[i]-dvy[i]*.25*t0[i]);
     double ux=(dvx[j]-dvx[i])*.25,uy=(dvy[j]-dvy[i])*.25;
     double a=ux*ux+uy*uy;
     if(a<=1e-18)continue;
     double b=2*(r0x*ux+r0y*uy);
     double cc=r0x*r0x+r0y*r0y-CONTACT2;
     double t;
     if(cc<=0)t=lo;
     else{
      double disc=b*b-4*a*cc;
      if(disc<0)continue;
      t=(-b-Math.sqrt(disc))/(2*a);
      if(t<lo||t>1)continue;
     }
     double cx=r0x+ux*t,cy=r0y+uy*t,d=Math.sqrt(cx*cx+cy*cy);
     if(d<1e-9||cx*ux+cy*uy>=0)continue;
     double nx=cx/d,ny=cy/d;
     if((vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny<=MIN_APPROACH)continue;
     if(t<bestT){bestT=t;bi=i;bj=j;bnx=nx;bny=ny;}
    }
    if(bi<0)break;
    double ciX=sx[bi]+dvx[bi]*.25*(bestT-t0[bi]),ciY=sy[bi]+dvy[bi]*.25*(bestT-t0[bi]);
    double cjX=sx[bj]+dvx[bj]*.25*(bestT-t0[bj]),cjY=sy[bj]+dvy[bj]*.25*(bestT-t0[bj]);
    double dx=cjX-ciX,dy=cjY-ciY,d=Math.sqrt(dx*dx+dy*dy),nx=bnx,ny=bny;
    double overlap=(CONTACT-d)/2;
    if(overlap>0){ciX-=nx*overlap;ciY-=ny*overlap;cjX+=nx*overlap;cjY+=ny*overlap;}
    double approach=(vx[bi]-vx[bj])*nx+(vy[bi]-vy[bj])*ny;
    if(bi==0&&firstContact==0)firstContact=bj;
    double incomingX=vx[bi],incomingY=vy[bi],incomingSpeed=Math.sqrt(incomingX*incomingX+incomingY*incomingY);
    double jn=(1+E_BALL)/2*approach;
    vx[bi]-=jn*nx;vy[bi]-=jn*ny;vx[bj]+=jn*nx;vy[bj]+=jn*ny;
    double tx=-ny,ty=nx,vt=(vx[bi]-vx[bj])*tx+(vy[bi]-vy[bj])*ty+SPIN_R*(wz[bi]+wz[bj]);
    double jt=-vt*.5,cap=MU_BB*jn;
    if(jt>cap)jt=cap;else if(jt<-cap)jt=-cap;
    vx[bi]-=jt*tx;vy[bi]-=jt*ty;vx[bj]+=jt*tx;vy[bj]+=jt*ty;
    wz[bi]-=jt*SPIN_T;wz[bj]-=jt*SPIN_T;
    if(bi==0&&top[0]!=0&&incomingSpeed>1e-9){
     double spinSpeed=Math.min(power*SHOT_SPEED*Math.abs(top[0]),incomingSpeed)*Math.min(1,approach/incomingSpeed);
     double forward=spinSpeed*.36*follow,lateral=spinSpeed*.18*side;
     double limit=Math.min(incomingSpeed,Math.sqrt(vx[0]*vx[0]+vy[0]*vy[0]+forward*forward+lateral*lateral));
     vx[0]+=(incomingX*forward-incomingY*lateral)/incomingSpeed;
     vy[0]+=(incomingY*forward+incomingX*lateral)/incomingSpeed;
     double outgoing=Math.sqrt(vx[0]*vx[0]+vy[0]*vy[0]);
     if(outgoing>limit){vx[0]*=limit/outgoing;vy[0]*=limit/outgoing;}
     top[0]*=.45;
    }
    top[bj]+=top[bi]*.2;
    sx[bi]=ciX;sy[bi]=ciY;t0[bi]=bestT;dvx[bi]=vx[bi];dvy[bi]=vy[bi];dirty[bi]=true;
    sx[bj]=cjX;sy[bj]=cjY;t0[bj]=bestT;dvx[bj]=vx[bj];dvy[bj]=vy[bj];dirty[bj]=true;
   }
   for(int i=0;i<16;i++)if(dirty[i]){
    x[i]=sx[i]+dvx[i]*.25*(1-t0[i]);y[i]=sy[i]+dvy[i]*.25*(1-t0[i]);
    var rail=PoolGeometry.resolveCushion(x[i],y[i],vx[i],vy[i]);
    x[i]=rail.x();y[i]=rail.y();
   }
   if(step%8==0&&frames.size()<600)frames.add(frame(x,y,alive));
   if(speed<.04&&step>1)break;
  }
  // Preserve a death frame when scratch occurs between 16ms replay samples.
  if(scratch){if(frames.isEmpty()||!frames.get(frames.size()-1).split(",")[2].equals("0"))frames.add(frame(x,y,alive));alive[0]=true;outer:for(int xx=180;xx<=420;xx+=30)for(int yy=80;yy<450;yy+=30){boolean free=true;for(int i=1;i<16;i++)if(alive[i]&&Math.sqrt((xx-x[i])*(xx-x[i])+(yy-y[i])*(yy-y[i]))<33)free=false;if(free){x[0]=xx;y[0]=yy;break outer;}}}
  for(int i=0;i<16;i++){c[i*3]=(int)Math.round(x[i]*10);c[i*3+1]=(int)Math.round(y[i]*10);c[i*3+2]=alive[i]?1:0;}
  boolean nine=s.game().equals("nineball");
  var legal=targetsFor(s.cells(),actor,s.game());
  boolean foul=scratch||!legal.contains(firstContact);
  boolean decisive=nine?potted.contains(9):black;
  boolean own=false;
  if(nine){
   for(int id:potted)if(id>0&&id<9)own=true;
   for(int seat=1;seat<=2;seat++){int count=0;for(int id=1;id<=9;id++)if(c[id*3+2]==0)count++;c[47+seat]=count;}
  }else{
   if(!foul&&c[49+actor]==0){for(int id:potted)if(group(id)!=0){c[49+actor]=group(id);c[52-actor]=3-group(id);break;}}
   for(int seat=1;seat<=2;seat++){c[47+seat]=0;if(c[49+seat]!=0)for(int id=1;id<16;id++)if(group(id)==c[49+seat]&&c[id*3+2]==0)c[47+seat]++;}
   for(int id:potted)if(group(id)!=0&&group(id)==c[49+actor])own=true;
  }
  boolean over=decisive||s.moves()+1>=200;
  int winner=nine
   ?(decisive?(!foul?actor:3-actor):over?(c[48]==c[49]?0:c[48]>c[49]?1:2):0)
   :(black?(!foul&&legal.size()==1&&legal.get(0)==8?actor:3-actor):over?(c[48]==c[49]?0:c[48]>c[49]?1:2):0);
  int penalty=c[PENALTY_VISIT];
  boolean useExtra=!foul&&!own&&penalty==PENALTY_READY;
  c[PENALTY_VISIT]=over?0:foul?PENALTY_READY:useExtra?PENALTY_ACTIVE:own&&penalty==PENALTY_READY?PENALTY_READY:0;
  String foulReason=scratch?"白球落袋":firstContact==0?"白球未碰到目标球":"白球先碰到非目标球";
  frames.add(frame(x,y,alive));
  return new GridRules.State(s.game(),c,!foul&&(own||useExtra)?actor:3-actor,winner,over,s.moves()+1,
   foul?"犯规："+foulReason:decisive?(nine?"9号球落袋":"8号球落袋"):"本杆落袋 "+pocket+" 颗",frames,command);
 }
 // Ball in hand after a scratch: the spot is authoritative but does not
 // consume a turn, so the player may adjust it repeatedly before shooting.
 private static GridRules.State placeCue(GridRules.State s,int actor,int command){
  if(command>=PLACE_BASE+PLACE_LIMIT||actor!=s.turn()||!cueInHand(s))throw new IllegalArgumentException("place");
  int body=command-PLACE_BASE,x=body/PLACE_STRIDE,y=body%PLACE_STRIDE;
  if(!legalSpot(s.cells(),x,y))throw new IllegalArgumentException("place");
  int[] c=Arrays.copyOf(s.cells(),PENALTY_VISIT+1);c[0]=x;c[1]=y;
  return new GridRules.State(s.game(),c,s.turn(),s.winner(),s.over(),s.moves(),s.fen(),List.of(),s.shotCommand());
 }
 private static boolean cueInHand(GridRules.State s){
  int[] c=s.cells();
  if(s.over()||c.length<=PENALTY_VISIT||c[2]!=1||c[PENALTY_VISIT]!=PENALTY_READY)return false;
  String fen=s.fen();return fen==null||fen.startsWith(CUE_IN_HAND_FEN);
 }
 private static boolean legalSpot(int[] c,int x,int y){
  if(x<CUE_MIN||x>CUE_MAX_X||y<CUE_MIN||y>CUE_MAX_Y)return false;
  if(PoolGeometry.pocketIndex(x/10.,y/10.)>=0)return false;
  for(int i=1;i<16;i++)if(c[i*3+2]==1){long dx=x-c[i*3],dy=y-c[i*3+1];if(dx*dx+dy*dy<(long)CUE_CLEARANCE*CUE_CLEARANCE)return false;}
  return true;
 }
 private static String frame(double[] x,double[] y,boolean[] alive){var p=new ArrayList<String>();for(int i=0;i<16;i++){p.add(""+Math.round(x[i]*10));p.add(""+Math.round(y[i]*10));p.add(alive[i]?"1":"0");}return String.join(",",p);}
 // Aim at the ghost ball for the most open pocket, scale power by distance,
 // and use a light follow/draw spot so the opponent also plays with spin.
 public static int bot(GridRules.State s){
  int[] c=s.cells();int target=s.game().equals("nineball")?9:8;double best=Double.MAX_VALUE;
  for(int i:targetsFor(c,s.turn(),s.game())){double dx=c[i*3]-c[0],dy=c[i*3+1]-c[1],d=Math.sqrt(dx*dx+dy*dy);if(d<best){target=i;best=d;}}
  double tx=c[target*3]/10.,ty=c[target*3+1]/10.,cx=c[0]/10.,cy=c[1]/10.;
  double[] hole=HOLES[0];double hd=Double.MAX_VALUE;
  for(double[] h:HOLES){double dx=h[0]-tx,dy=h[1]-ty,d=dx*dx+dy*dy;if(d<hd){hd=d;hole=h;}}
  double px=tx-hole[0],py=ty-hole[1],pl=Math.sqrt(px*px+py*py);if(pl==0)pl=1;
  double gx=tx+32*px/pl,gy=ty+32*py/pl;
  int a=((int)Math.round(Math.atan2(gy-cy,gx-cx)*1800/Math.PI)+3600)%3600;
  int power=Math.max(28,Math.min(92,(int)Math.round(34+Math.sqrt((gx-cx)*(gx-cx)+(gy-cy)*(gy-cy))/14)));
  int spot=best>3200?1:5;
  return spot*363600+power*3600+a;
 }
 private static int group(int id){return id>0&&id<8?1:id>8&&id<16?2:0;}
 private static List<Integer> targets(int[] c,int actor){int g=c[49+actor];var ids=new ArrayList<Integer>();for(int id=1;id<16;id++)if(id!=8&&c[id*3+2]==1&&(g==0||group(id)==g))ids.add(id);if(ids.isEmpty()&&g!=0&&c[26]==1)ids.add(8);return ids;}
 /* Nine-ball mirrors dist/table/pool-rules.js: ids 10..15 are never racked,
    the lowest live ball is the only legal first contact, and a legal 9 wins.
    The eight-ball targets() path above is deliberately left byte-for-byte. */
 private static List<Integer> nineballTargets(int[] c){var ids=new ArrayList<Integer>();for(int id=1;id<=9;id++)if(c[id*3+2]==1){ids.add(id);break;}return ids;}
 private static List<Integer> targetsFor(int[] c,int actor,String game){return game.equals("nineball")?nineballTargets(c):targets(c,actor);}
}
