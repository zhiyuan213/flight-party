package com.flightparty.table;
import java.util.*;
/** Snooker in the shared room pipeline. Server-authoritative cue physics plus
 *  red/colour alternation, colour respots and the final clearing sequence.
 *
 *  cells: [0..65] 22 balls x (x*10,y*10,alive), [66] P1 score, [67] P2 score,
 *  [68] ball on (-1 red / -2 any colour / 1..6 clearing), [69] break,
 *  [70] cue in hand, [71] last penalty. Mirrors snooker-duel.js.
 *  command = nomination * 3600000 + power * 3600 + angle (tenths of a degree). */
public final class SnookerRules {
 private static final int NOM_BASE=3600000;
 private static final int S_SCORE1=66,S_SCORE2=67,S_ON=68,S_BREAK=69,S_INHAND=70,S_PENALTY=71;
 private static final int SIZE=72,BALLS=22,R=8;
 private static final int ON_RED=-1,ON_COLOUR=-2;
 private static final double[][] SPOTS={{245,290},{260,330},{260,170},{260,250},{500,250},{752,250},{918,250}};
 private static final double[][] CUE_SPOTS={{240,250},{225,250},{210,250},{240,225},{240,275},{245,290},{235,290},{200,250}};
 private static int value(int id){return id>6?1:id+1;}
 private static boolean free(int[] c,int id,double x,double y){
  for(int i=0;i<BALLS;i++)if(i!=id&&c[i*3+2]!=0&&Math.hypot(c[i*3]/10.-x,c[i*3+1]/10.-y)<2*R)return false;
  return true;
 }
 private static void respot(int[] c,int id){
  double[] spot=SPOTS[id];double[] position=null;
  int[] order=new int[]{id,6,5,4,3,2,1};
  for(int k:order)if(free(c,id,SPOTS[k][0],SPOTS[k][1])){position=SPOTS[k];break;}
  for(int d=1;position==null&&d<1000;d++){
   double right=spot[0]+d,left=spot[0]-d;
   if(right>R&&right<1000-R&&free(c,id,right,spot[1]))position=new double[]{right,spot[1]};
   else if(left>R&&left<1000-R&&free(c,id,left,spot[1]))position=new double[]{left,spot[1]};
  }
  if(position!=null){c[id*3]=(int)Math.round(position[0]*10);c[id*3+1]=(int)Math.round(position[1]*10);c[id*3+2]=1;}
 }
 private static List<Integer> targets(int[] c,int on){
  var ids=new ArrayList<Integer>();
  if(on==ON_RED){for(int id=7;id<BALLS;id++)if(c[id*3+2]==1)ids.add(id);}
  else if(on==ON_COLOUR){for(int id=1;id<=6;id++)if(c[id*3+2]==1)ids.add(id);}
  else ids.add(on);
  return ids;
 }
 private static String frame(double[] x,double[] y,boolean[] alive){
  var p=new ArrayList<String>();
  for(int i=0;i<BALLS;i++){p.add(""+Math.round(x[i]*10));p.add(""+Math.round(y[i]*10));p.add(alive[i]?"1":"0");}
  return String.join(",",p);
 }
 public static GridRules.State start(){
  int[] c=new int[SIZE];
  for(int i=0;i<SPOTS.length;i++){c[i*3]=(int)Math.round(SPOTS[i][0]*10);c[i*3+1]=(int)Math.round(SPOTS[i][1]*10);c[i*3+2]=1;}
  int k=7;
  for(int col=0;col<5;col++)for(int row=0;row<=col;row++){
   c[k*3]=(int)Math.round((769+col*14.2)*10);
   c[k*3+1]=(int)Math.round((250+(row-col/2.)*16.4)*10);
   c[k*3+2]=1;k++;
  }
  c[S_ON]=ON_RED;
  return new GridRules.State("snooker",c,1,0,false,0,"",List.of());
 }
 public static GridRules.State move(GridRules.State s,int actor,int command){
  if(s.over()||actor!=s.turn())throw new IllegalStateException("turn");
  int nomination=command/NOM_BASE,shot=command%NOM_BASE,power=shot/3600,angle=shot%3600;
  if(command<0||nomination>6||power<1||power>100)throw new IllegalArgumentException("shot");
  int[] before=s.cells();
  var legal=targets(before,before[S_ON]);
  double[] x=new double[BALLS],y=new double[BALLS],vx=new double[BALLS],vy=new double[BALLS];
  boolean[] alive=new boolean[BALLS];
  int[] c=Arrays.copyOf(before,SIZE);
  for(int i=0;i<BALLS;i++){x[i]=before[i*3]/10.;y[i]=before[i*3+1]/10.;alive[i]=before[i*3+2]==1;}
  vx[0]=Math.cos(angle*Math.PI/1800)*power*.48;vy[0]=Math.sin(angle*Math.PI/1800)*power*.48;
  var frames=new ArrayList<String>();var potted=new ArrayList<Integer>();
  boolean scratch=false;int firstContact=0;
  for(int step=0;step<4800;step++){
   double speed=0;
   for(int i=0;i<BALLS;i++)if(alive[i]){
    x[i]+=vx[i]*.25;y[i]+=vy[i]*.25;
    if(PoolGeometry.pocketIndex(x[i],y[i])>=0){alive[i]=false;potted.add(i);vx[i]=vy[i]=0;if(i==0)scratch=true;continue;}
    var rail=PoolGeometry.resolveCushion(x[i],y[i],vx[i],vy[i],R);
    x[i]=rail.x();y[i]=rail.y();vx[i]=rail.vx();vy[i]=rail.vy();
    vx[i]*=Math.pow(.991,.25);vy[i]*=Math.pow(.991,.25);
    if(Math.hypot(vx[i],vy[i])<.035){vx[i]=vy[i]=0;}
    speed+=Math.hypot(vx[i],vy[i]);
   }
   for(int i=0;i<BALLS;i++)for(int j=i+1;j<BALLS;j++)if(alive[i]&&alive[j]){
    double dx=x[j]-x[i],dy=y[j]-y[i],d=Math.hypot(dx,dy);
    if(d>0&&d<2*R){
     double nx=dx/d,ny=dy/d,overlap=(2*R-d)/2;
     x[i]-=nx*overlap;y[i]-=ny*overlap;x[j]+=nx*overlap;y[j]+=ny*overlap;
     double impulse=(vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny;
     if(impulse>0){if(i==0&&firstContact==0)firstContact=j;
      vx[i]-=impulse*nx;vy[i]-=impulse*ny;vx[j]+=impulse*nx;vy[j]+=impulse*ny;}
    }
   }
   if(step%8==0&&frames.size()<600)frames.add(frame(x,y,alive));
   if(speed<.04&&step>1)break;
  }
  if(scratch){
   if(frames.isEmpty()||!frames.get(frames.size()-1).split(",")[2].equals("0"))frames.add(frame(x,y,alive));
   alive[0]=true;
   outer:for(int xx=180;xx<=420;xx+=30)for(int yy=80;yy<450;yy+=30){
    boolean freeSpot=true;
    for(int i=1;i<BALLS;i++)if(alive[i]&&Math.hypot(xx-x[i],yy-y[i])<33){freeSpot=false;break;}
    if(freeSpot){x[0]=xx;y[0]=yy;break outer;}
   }
  }
  for(int i=0;i<BALLS;i++){c[i*3]=(int)Math.round(x[i]*10);c[i*3+1]=(int)Math.round(y[i]*10);c[i*3+2]=alive[i]?1:0;}
  int on=before[S_ON];
  int nominated=legal.contains(nomination)?nomination:firstContact;
  java.util.function.IntPredicate allowed=id->on==ON_COLOUR?(id==nominated&&legal.contains(id)):legal.contains(id);
  boolean foul=!allowed.test(firstContact);
  for(int id:potted)if(!allowed.test(id))foul=true;
  int ballOn=on==ON_RED?1:on==ON_COLOUR?(legal.contains(nominated)?value(nominated):4):value(on);
  int penalty=0;
  if(foul){penalty=Math.max(4,ballOn);
   if(firstContact>0)penalty=Math.max(penalty,value(firstContact));
   for(int id:potted)if(id>0)penalty=Math.max(penalty,value(id));}
  int scored=0;if(!foul)for(int id:potted)scored+=value(id);
  int s1=before[S_SCORE1],s2=before[S_SCORE2],other=3-actor;
  if(actor==1)s1+=scored;else s2+=scored;
  if(other==1)s1+=penalty;else s2+=penalty;
  for(int id:potted)if(id>=1&&id<=6&&(foul||on==ON_RED||on==ON_COLOUR))respot(c,id);
  boolean clearedBlack=on==6&&(scored>0||foul),tied=clearedBlack&&s1==s2;
  if(tied)respot(c,6);
  if(tied||potted.contains(0)){
   boolean placed=false;
   for(double[] p:CUE_SPOTS)if(free(c,0,p[0],p[1])){
    c[0]=(int)Math.round(p[0]*10);c[1]=(int)Math.round(p[1]*10);c[2]=1;
    x[0]=p[0];y[0]=p[1];alive[0]=true;placed=true;break;
   }
   if(!placed){c[0]=2450;c[1]=2900;c[2]=1;x[0]=245;y[0]=290;alive[0]=true;}
  }
  int reds=0;for(int id=7;id<BALLS;id++)if(c[id*3+2]==1)reds++;
  int nextOn;
  if(clearedBlack)nextOn=6;
  else if(scored>0&&on==ON_RED)nextOn=ON_COLOUR;
  else if(reds>0)nextOn=ON_RED;
  else if(on>0)nextOn=on+(scored>0?1:0);
  else nextOn=1;
  boolean over=clearedBlack&&!tied;
  int winner=over?(s1>s2?1:2):0;
  int turn=scored>0&&!clearedBlack?actor:other;
  int breakScore=scored>0&&!clearedBlack?before[S_BREAK]+scored:0;
  c[S_SCORE1]=s1;c[S_SCORE2]=s2;c[S_ON]=nextOn;c[S_BREAK]=breakScore;c[S_INHAND]=0;c[S_PENALTY]=penalty;
  String fen=penalty>0?"犯规 +"+penalty:s1+" : "+s2+" · 单杆 "+breakScore;
  String lastFrame=frame(x,y,alive);
  if(frames.isEmpty())frames.add(lastFrame);else frames.set(frames.size()-1,lastFrame);
  return new GridRules.State("snooker",c,turn,winner,over,s.moves()+1,fen,frames,command);
 }
 public static int bot(GridRules.State s){
  int[] c=s.cells();var legal=targets(c,c[S_ON]);
  double x=c[0]/10.,y=c[1]/10.;int best=0;double distance=Double.MAX_VALUE;
  for(int id:legal){double d=Math.hypot(c[id*3]/10.-x,c[id*3+1]/10.-y);if(d<distance){distance=d;best=id;}}
  double angle=best==0?0:Math.atan2(c[best*3+1]/10.-y,c[best*3]/10.-x);
  int a=((int)Math.round(angle*1800/Math.PI)+3600)%3600;
  int nomination=c[S_ON]==ON_COLOUR&&best>=1&&best<=6?best:0;
  return nomination*NOM_BASE+62*3600+a;
 }
 public static List<Integer> legal(){return List.of();}
}
