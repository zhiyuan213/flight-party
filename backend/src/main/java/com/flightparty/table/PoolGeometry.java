package com.flightparty.table;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Mirror of pool-geometry.js: center-in-well capture and cloth-facing cushion surfaces. */
final class PoolGeometry {
 private static final double[][] HOLES={{0,0},{500,0},{1000,0},{0,500},{500,500},{1000,500}};
 private record Segment(double[] a,double[] b,double dx,double dy,double length,double nx,double ny) {}
 record Rebound(double x,double y,double vx,double vy,double normalSpeed,double nx,double ny,boolean hit) {}
 private static final List<List<double[]>> WELLS=List.of(outline(false),outline(true));
 private static final List<List<Segment>> RAILS=rails();

 private static void curve(List<double[]> points,double[] a,double[] b,double[] c){
  double[] p=points.getLast();
  for(int i=1;i<=24;i++){
   double t=i/24.,u=1-t;
   points.add(new double[]{u*u*u*p[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*c[0],u*u*u*p[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*c[1]});
  }
 }
 private static List<double[]> outline(boolean middle){
  var p=new ArrayList<double[]>();
  if(middle){
   p.add(new double[]{-26,-20});curve(p,new double[]{-24,-40},new double[]{-20,-54},new double[]{0,-54});
   curve(p,new double[]{20,-54},new double[]{24,-40},new double[]{26,-20});
   curve(p,new double[]{23,1},new double[]{-23,1},new double[]{-26,-20});
  }else{
   p.add(new double[]{18,-20});p.add(new double[]{-3,-40});
   curve(p,new double[]{-16,-53},new double[]{-34,-47},new double[]{-43,-34});
   curve(p,new double[]{-54,-19},new double[]{-45,-5},new double[]{-33,7});p.add(new double[]{-20,18});
   curve(p,new double[]{2,18},new double[]{18,2},new double[]{18,-20});
  }
  return p;
 }
 private static boolean inside(double x,double y,List<double[]> points){
  boolean result=false;
  for(int i=0,j=points.size()-1;i<points.size();j=i++){
   double[] a=points.get(i),b=points.get(j);
   if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
 }
 static int pocketIndex(double x,double y){
  for(int i=0;i<HOLES.length;i++){
   double hx=HOLES[i][0],hy=HOLES[i][1],dx=(x-hx)*(hx==1000?-1:1),dy=(y-hy)*(hy==500?-1:1);
   if(Math.abs(dx)>64||Math.abs(dy)>64)continue;
   if(inside(dx,dy,WELLS.get(hx==500?1:0)))return i;
  }
  return -1;
 }
 private static List<double[]> mirror(List<double[]> source,boolean horizontal){
  var points=new ArrayList<double[]>();
  for(var p:source)points.add(horizontal?new double[]{1000-p[0],p[1]}:new double[]{p[0],500-p[1]});
  Collections.reverse(points);return points;
 }
 private static List<List<Segment>> rails(){
  var topLeft=new ArrayList<double[]>(List.of(new double[]{18,-20},new double[]{38,0},new double[]{466,0}));
  curve(topLeft,new double[]{472,0},new double[]{472,-4},new double[]{474,-20});
  var topRight=mirror(topLeft,true);
  var leftSide=List.of(new double[]{-20,482},new double[]{0,462},new double[]{0,38},new double[]{-20,18});
  var paths=List.of(topLeft,topRight,mirror(topLeft,false),mirror(topRight,false),leftSide,mirror(leftSide,true));
  var rails=new ArrayList<List<Segment>>();
  for(var points:paths){
   var segments=new ArrayList<Segment>();
   for(int i=1;i<points.size();i++){
    double[] a=points.get(i-1),b=points.get(i);double dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    segments.add(new Segment(a,b,dx,dy,length,-dy/length,dx/length));
   }
   rails.add(segments);
  }
  return rails;
 }
 static Rebound resolveCushion(double x,double y,double vx,double vy){return resolveCushion(x,y,vx,vy,16);}
 /** Snooker balls are half the diameter of pool balls; the cloth-facing rails
  *  sit the same distance from the ball centre as the JS geometry does. */
 static Rebound resolveCushion(double x,double y,double vx,double vy,double radius){
  double normalSpeed=0,nx=0,ny=0;boolean hit=false;
  for(int pass=0;pass<2;pass++)for(var segments:RAILS){
   Segment nearest=null;double nearestDx=0,nearestDy=0,nearestD=0;
   for(var s:segments){
    if(x<Math.min(s.a[0],s.b[0])-radius||x>Math.max(s.a[0],s.b[0])+radius||y<Math.min(s.a[1],s.b[1])-radius||y>Math.max(s.a[1],s.b[1])+radius)continue;
    double t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.length*s.length)));
    double dx=x-s.a[0]-s.dx*t,dy=y-s.a[1]-s.dy*t,d=Math.hypot(dx,dy);
    if(d<radius&&(nearest==null||d<nearestD)){nearest=s;nearestDx=dx;nearestDy=dy;nearestD=d;}
   }
   if(nearest==null)continue;
   var s=nearest;double dx=nearestDx,dy=nearestDy,d=nearestD;
   boolean front=dx*s.nx+dy*s.ny>=0;
   double ux=front&&d>1e-9?dx/d:s.nx,uy=front&&d>1e-9?dy/d:s.ny,overlap=front?radius-d:radius+d;
   x+=ux*overlap;y+=uy*overlap;
   double incoming=-(vx*ux+vy*uy);
   if(incoming>0){
    vx+=1.92*incoming*ux;vy+=1.92*incoming*uy;hit=true;
    if(incoming>normalSpeed){normalSpeed=incoming;nx=ux;ny=uy;}
   }
  }
  return new Rebound(x,y,vx,vy,normalSpeed,nx,ny,hit);
 }
}
