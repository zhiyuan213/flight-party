package com.flightparty.table;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class PoolRulesTest {
 @Test void foulGrantsOneExtraShotAndLegacyStateLoads(){
  var s=clearTable(250,250);
  s.cells()[50]=1;s.cells()[51]=2;
  s.cells()[27]=4500;s.cells()[28]=2500;s.cells()[29]=1;
  s=new GridRules.State("pool",java.util.Arrays.copyOf(s.cells(),52),1,0,false,0,"",java.util.List.of());
  var foul=PoolRules.move(s,1,25*3600);
  assertEquals("犯规：白球先碰到非目标球",foul.fen());
  assertEquals(2,foul.turn());
  assertEquals(1,foul.cells()[52]);
  var normal=PoolRules.move(foul,2,25*3600);
  assertEquals(2,normal.turn());
  assertEquals(2,normal.cells()[52]);
  var extra=PoolRules.move(normal,2,25*3600);
  assertEquals(1,extra.turn());
  assertEquals(0,extra.cells()[52]);
  var miss=PoolRules.move(extra,1,3600);
  assertEquals("犯规：白球未碰到目标球",miss.fen());
  assertEquals(1,miss.cells()[52]);
 }
 private static GridRules.State clearTable(int x,int y){var s=PoolRules.start();for(int id=1;id<16;id++)s.cells()[id*3+2]=0;s.cells()[0]=x*10;s.cells()[1]=y*10;return s;}
 @Test void passingEitherMiddleMouthDoesNotSinkOrPullTheBall(){
  for(int y:new int[]{16,484})for(int direction:new int[]{1,-1}){
   var r=PoolRules.move(clearTable(direction==1?400:600,y),1,5*3600+(direction==1?0:1800));boolean crossed=false;
   for(String text:r.history()){
    String[] f=text.split(",");int x=Integer.parseInt(f[0]);crossed|=direction*(x/10.-500)>30;
    assertEquals("1",f[2]);assertEquals(y*10,Integer.parseInt(f[1]),2);
   }
   assertTrue(crossed,"must actually cross the whole middle mouth");
  }
 }
 @Test void stationaryBallMayRestOnClothInFrontOfEitherWell(){
  for(int y:new int[]{0,8,492,500}){
   var s=clearTable(250,250);s.cells()[3]=5000;s.cells()[4]=y*10;s.cells()[5]=1;
   var r=PoolRules.move(s,1,5*3600);assertEquals(1,r.cells()[5]);assertEquals(5000,r.cells()[3]);assertEquals(y*10,r.cells()[4]);
  }
 }
 @Test void allSixPocketsWaitForCenterToCrossTheirActualWell(){
  int[][] entries={{50,50,2250,0},{500,60,2700,1},{950,50,3150,2},{50,450,1350,3},{500,440,900,4},{950,450,450,5}};
  for(int power:new int[]{5,30,100})for(int[] e:entries){
   var r=PoolRules.move(clearTable(e[0],e[1]),1,power*3600+e[2]);int dead=-1;
   for(int i=0;i<r.history().size();i++){String[] f=r.history().get(i).split(",");if(f[2].equals("0")){dead=i;assertEquals(e[3],PoolGeometry.pocketIndex(Integer.parseInt(f[0])/10.,Integer.parseInt(f[1])/10.));break;}}
   assertTrue(dead>0,"visible approach before capture");assertEquals("1",r.history().get(dead-1).split(",")[2]);assertEquals(1,r.cells()[2]);
  }
 }
 @Test void roundedJawsReflectSymmetricallyWithoutAddingEnergy(){
  var a=PoolGeometry.resolveCushion(479,8,-1,-1);var b=PoolGeometry.resolveCushion(521,8,1,-1);var c=PoolGeometry.resolveCushion(479,492,-1,1);
  for(var r:new PoolGeometry.Rebound[]{a,b,c}){assertTrue(r.hit());assertTrue(r.normalSpeed()>0);assertTrue(Math.hypot(r.vx(),r.vy())<=Math.sqrt(2)+1e-9);assertEquals(-1,PoolGeometry.pocketIndex(r.x(),r.y()));}
  assertEquals(a.x(),1000-b.x(),1e-8);assertEquals(a.y(),b.y(),1e-8);assertEquals(a.vx(),-b.vx(),1e-8);assertEquals(a.vy(),b.vy(),1e-8);
  assertEquals(a.x(),c.x(),1e-8);assertEquals(a.y(),500-c.y(),1e-8);assertEquals(a.vx(),c.vx(),1e-8);assertEquals(a.vy(),-c.vy(),1e-8);
 }
 @Test void allPocketApproachesStayInsidePhysicalFrame(){
  for(int power:new int[]{1,20,100})for(int angle:new int[]{0,150,450,900,1350,1800,2250,2700,3150}){
   var r=PoolRules.move(clearTable(500,250),1,power*3600+angle);
   for(String text:r.history()){String[] f=text.split(",");if(f[2].equals("1")){int x=Integer.parseInt(f[0]),y=Integer.parseInt(f[1]);assertTrue(x>=-700&&x<=10700);assertTrue(y>=-700&&y<=5700);}}
  }
 }
 @Test void firstValidPocketAssignsGroups(){for(int id:new int[]{1,9}){var s=PoolRules.start();s.cells()[0]=1500;s.cells()[1]=1500;s.cells()[id*3]=400;s.cells()[id*3+1]=400;var r=PoolRules.move(s,1,80*3600+2250);assertEquals(id==1?1:2,r.cells()[50]);assertEquals(id==1?2:1,r.cells()[51]);assertEquals(1,r.cells()[48]);assertEquals(1,r.turn());assertEquals(0,r.cells()[id*3+2]);}}
 @Test void wrongGroupFirstContactChangesTurn(){var s=PoolRules.start();s.cells()[50]=1;s.cells()[51]=2;s.cells()[0]=1500;s.cells()[1]=1500;s.cells()[27]=400;s.cells()[28]=400;var r=PoolRules.move(s,1,80*3600+2250);assertEquals(2,r.turn());assertEquals(1,r.cells()[50]);assertEquals(1,r.cells()[49]);}
 @Test void allEightSpotsMatchClientGoldenFixtures(){int[][] cue={{2029,4760},{1800,800},{1967,2965},{1855,3492},{2859,3479},{1855,1508},{3299,1198},{2971,1417}};for(int spot=1;spot<=8;spot++){int command=spot*363600+234000;var a=PoolRules.move(PoolRules.start(),1,command);var b=PoolRules.move(PoolRules.start(),1,command);assertArrayEquals(a.cells(),b.cells());assertEquals(cue[spot-1][0],a.cells()[0]);assertEquals(cue[spot-1][1],a.cells()[1]);for(int i=0;i<16;i++)if(a.cells()[i*3+2]==1){assertTrue(a.cells()[i*3]>=-700&&a.cells()[i*3]<=10700);assertTrue(a.cells()[i*3+1]>=-700&&a.cells()[i*3+1]<=5700);}assertTrue(a.history().size()<=601);assertEquals(1,a.moves());}}
 @Test void sideSpinChangesCushionRebound(){var center=PoolRules.move(PoolRules.start(),1,65*3600+1800);var left=PoolRules.move(PoolRules.start(),1,7*363600+65*3600+1800);var right=PoolRules.move(PoolRules.start(),1,3*363600+65*3600+1800);assertNotEquals(center.cells()[1],left.cells()[1]);assertNotEquals(center.cells()[1],right.cells()[1]);assertEquals(0,left.cells()[48]);assertEquals(0,left.cells()[49]);}
 @Test void rejectInvalidSpotCommands(){for(int command:new int[]{-1,0,3599,363600,363600+3599,9*363600+3600,Integer.MAX_VALUE})assertThrows(IllegalArgumentException.class,()->PoolRules.move(PoolRules.start(),1,command));}
 @Test void deterministicAndBounded(){var s=PoolRules.start();var a=PoolRules.move(s,1,PoolRules.bot(s));var b=PoolRules.move(s,1,PoolRules.bot(s));assertArrayEquals(a.cells(),b.cells());assertTrue(a.history().size()>1);assertThrows(IllegalArgumentException.class,()->PoolRules.move(s,1,0));}
 @Test void scratchAndBlackRules(){var s=PoolRules.start();s.cells()[0]=400;s.cells()[1]=400;var scratch=PoolRules.move(s,1,50*3600+2250);assertEquals(1,scratch.cells()[2]);assertEquals(2,scratch.turn());for(boolean clear:new boolean[]{false,true}){s=PoolRules.start();s.cells()[50]=1;s.cells()[51]=2;if(clear)for(int i=1;i<8;i++)s.cells()[i*3+2]=0;s.cells()[0]=1500;s.cells()[1]=1500;s.cells()[24]=400;s.cells()[25]=400;var result=PoolRules.move(s,1,80*3600+2250);assertTrue(result.over());assertEquals(clear?1:2,result.winner());}}
 @Test void strongerShotsTransferMomentumAndRemainBounded(){
  for(int offset:new int[]{0,31}){var s=PoolRules.start();for(int i=2;i<16;i++)s.cells()[i*3+2]=0;s.cells()[0]=1000;s.cells()[1]=2500;s.cells()[3]=1800;s.cells()[4]=(250+offset)*10;var r=PoolRules.move(s,1,360000);assertTrue(r.history().stream().anyMatch(f->Math.abs(Integer.parseInt(f.split(",")[3])-1800)>10));}
  for(int angle:new int[]{0,150,450,900,1350,1800,2250,2700,3150}){var r=PoolRules.move(PoolRules.start(),1,360000+angle);for(String text:r.history()){String[] frame=text.split(",");for(int i=0;i<16;i++)if(frame[i*3+2].equals("1")){int x=Integer.parseInt(frame[i*3]),y=Integer.parseInt(frame[i*3+1]);assertTrue(x>=-700&&x<=10700);assertTrue(y>=-700&&y<=5700);}}}
 }
 @Test void fullPowerTraversesOverFourTableLengths(){var s=PoolRules.start();for(int i=1;i<16;i++)s.cells()[i*3+2]=0;var r=PoolRules.move(s,1,360000);double distance=0;int x=s.cells()[0],y=s.cells()[1];for(String text:r.history()){String[] f=text.split(",");int nx=Integer.parseInt(f[0]),ny=Integer.parseInt(f[1]);distance+=Math.hypot(nx-x,ny-y)/10.;x=nx;y=ny;}assertTrue(distance>4250&&distance<4450);} @Test void nearPocketScratchIsRecordedBeforeRespawn(){var s=PoolRules.start();for(int i=1;i<16;i++)s.cells()[i*3+2]=0;s.cells()[0]=400;s.cells()[1]=400;var r=PoolRules.move(s,1,360000+2250);assertEquals("1",r.history().get(0).split(",")[2]);assertEquals("1",r.history().get(r.history().size()-1).split(",")[2]);assertEquals(1,r.history().stream().filter(f->f.split(",")[2].equals("0")).count());assertEquals(1,r.cells()[2]);assertEquals(2,r.turn());}
 private static GridRules.State spinScene(int cueX,int targetX,int offset){var s=clearTable(cueX,250);if(targetX!=0){s.cells()[3]=targetX*10;s.cells()[4]=(250+offset)*10;s.cells()[5]=1;}return s;}
 private static GridRules.State spinShot(GridRules.State s,int spot,int power,int angle){return PoolRules.move(s,1,spot*363600+power*3600+angle);}
 @Test void sameShotHasVisibleFollowDrawAndOpposingSideSpinOutcomes(){
  int[] spots={0,1,5,3,7};int[][] positions={{4188,2500},{6728,2500},{1648,2500},{4188,3751},{4188,1249}};
  for(int i=0;i<spots.length;i++){var r=spinShot(spinScene(250,450,0),spots[i],25,0);assertEquals(positions[i][0],r.cells()[0]);assertEquals(positions[i][1],r.cells()[1]);assertEquals(8201,r.cells()[3]);assertEquals(2500,r.cells()[4]);assertEquals(1,r.cells()[5]);}
 }
 @Test void spinDoesNotInventCurveBeforeAnyContact(){var center=spinShot(clearTable(250,250),0,5,0);for(int spot=1;spot<=8;spot++)assertEquals(center.history(),spinShot(clearTable(250,250),spot,5,0).history());}
 @Test void followAndDrawUseIncomingDirectionAfterCushion(){int[] spots={0,1,5},xs={6320,5888,6752};for(int i=0;i<spots.length;i++){var r=spinShot(spinScene(800,600,0),spots[i],20,0);assertEquals(xs[i],r.cells()[0]);assertEquals(2500,r.cells()[1]);}}
 @Test void sideSpinCushionKicksAreStrongerAndMirrorAcrossTable(){
  for(int spot:new int[]{3,7}){var a=spinShot(clearTable(250,250),spot,25,1800);var b=spinShot(clearTable(750,250),10-spot,25,0);assertEquals(10000,a.cells()[0]+b.cells()[0]);assertEquals(a.cells()[1],b.cells()[1]);assertEquals(5835,a.cells()[0]);assertEquals(spot==3?4284:716,a.cells()[1]);}
 }
 private static double frameSpeed(int[] a,int[] b,int id){return Math.hypot(b[id*3]-a[id*3],b[id*3+1]-a[id*3+1])/20.;}
 @Test void thinAndLateContactsStayWithinFiniteSpinEnergyBudget(){
  for(int target:new int[]{450,700})for(int offset:new int[]{0,28,31})for(int spot=1;spot<=8;spot++){
   var s=spinScene(250,target,offset);var r=spinShot(s,spot,30,0);var frames=r.history().stream().map(t->java.util.Arrays.stream(t.split(",")).mapToInt(Integer::parseInt).toArray()).toList();int contact=-1;
   for(int i=0;i<frames.size();i++)if(frames.get(i)[3]!=s.cells()[3]||frames.get(i)[4]!=s.cells()[4]){contact=i;break;}
   assertTrue(contact>2);double before=frameSpeed(frames.get(contact-3),frames.get(contact-2),0),cue=frameSpeed(frames.get(contact+1),frames.get(contact+2),0),object=frameSpeed(frames.get(contact+1),frames.get(contact+2),1);
   assertTrue(cue<=before+.1);assertTrue(cue*cue+object*object<=before*before*1.14+.4);
  }
 }
}
