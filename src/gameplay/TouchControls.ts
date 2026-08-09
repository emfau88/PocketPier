export interface Point { x:number;y:number }

export function virtualJoystickVector(origin:Point,pointer:Point,maxRadius=42,deadzone=7):Point{
  const dx=pointer.x-origin.x,dy=pointer.y-origin.y,distance=Math.hypot(dx,dy);
  if(distance<=deadzone||maxRadius<=deadzone)return {x:0,y:0};
  const strength=Math.min(1,(distance-deadzone)/(maxRadius-deadzone));
  return {x:dx/distance*strength,y:dy/distance*strength};
}

export function joystickKnobPosition(origin:Point,pointer:Point,maxRadius=42):Point{
  const dx=pointer.x-origin.x,dy=pointer.y-origin.y,distance=Math.hypot(dx,dy);
  if(distance<=maxRadius||distance===0)return {x:pointer.x,y:pointer.y};
  return {x:origin.x+dx/distance*maxRadius,y:origin.y+dy/distance*maxRadius};
}
