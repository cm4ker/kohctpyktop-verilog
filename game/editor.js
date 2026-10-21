// From SimulationState.ProcessMouseDown; coordinates are grid cells.
import {Canvas} from "./canvas.js";
export class Editor {
constructor(canvas) {this.canvas=canvas;this.tool=0;this.alternate=false;this.showMetal=true;}
paint(param1,param2=param1) {
         var _loc3_ = null;
         var _loc4_ = null;
         var _loc5_ = undefined;
         var _loc6_ = 0;
         var _loc7_ = 0;
         var _loc8_ = false;
         var _loc9_ = 0;
         var _loc10_ = 0;
         var _loc11_ = 0;
         var _loc12_ = 0;
         var _loc13_ = 0;
         _loc3_ = param1;
         _loc4_ = param2;
         _loc5_ = _loc3_.x < 4 || _loc3_.x >= 40;
         if(_loc3_.x < 0 || _loc3_.y < 0 || _loc3_.x >= this.canvas.width || _loc3_.y >= this.canvas.height)
         {
            return;
         }
         if(_loc4_.x < 0 || _loc4_.y < 0 || _loc4_.x >= this.canvas.width || _loc4_.y >= this.canvas.height)
         {
            return;
         }
         if(this.tool == 0)
         {
            if(_loc5_)
            {
               return;
            }
            _loc6_ = this.alternate ? Math.trunc(Canvas.SILICON_P) : Math.trunc(Canvas.SILICON_N);
            _loc7_ = Math.trunc(this.canvas.silicon[_loc4_.x][_loc4_.y]);
            if(this.canvas.silicon[_loc3_.x][_loc3_.y] == Canvas.SILICON_NONE || this.canvas.silicon[_loc3_.x][_loc3_.y] == _loc6_)
            {
               _loc8_ = false;
               if(Boolean(this.canvas.gateHorizontal[_loc3_.x][_loc3_.y]) && _loc3_.x == _loc4_.x)
               {
                  _loc8_ = true;
               }
               if(Boolean(this.canvas.gateVertical[_loc3_.x][_loc3_.y]) && _loc3_.y == _loc4_.y)
               {
                  _loc8_ = true;
               }
               if(!_loc8_)
               {
                  this.canvas.silicon[_loc3_.x][_loc3_.y] = _loc6_;
                  if(_loc7_ == _loc6_)
                  {
                     if(_loc4_.x < _loc3_.x && _loc4_.y == _loc3_.y && !this.canvas.gateVertical[_loc4_.x][_loc4_.y])
                     {
                        this.canvas.siliconConnectedRight[_loc4_.x][_loc4_.y] = true;
                     }
                     if(_loc4_.x > _loc3_.x && _loc4_.y == _loc3_.y && !this.canvas.gateVertical[_loc4_.x][_loc4_.y])
                     {
                        this.canvas.siliconConnectedRight[_loc3_.x][_loc3_.y] = true;
                     }
                     if(_loc4_.y < _loc3_.y && _loc4_.x == _loc3_.x && !this.canvas.gateHorizontal[_loc4_.x][_loc4_.y])
                     {
                        this.canvas.siliconConnectedDown[_loc4_.x][_loc4_.y] = true;
                     }
                     if(_loc4_.y > _loc3_.y && _loc4_.x == _loc3_.x && !this.canvas.gateHorizontal[_loc4_.x][_loc4_.y])
                     {
                        this.canvas.siliconConnectedDown[_loc3_.x][_loc3_.y] = true;
                     }
                  }
               }
            }
            else
            {
               _loc9_ = Math.trunc(this.canvas.silicon[_loc3_.x][_loc3_.y]);
               if((_loc3_.x != _loc4_.x || _loc3_.y != _loc4_.y) && _loc7_ == _loc6_ && _loc9_ != Canvas.SILICON_NONE)
               {
                  _loc10_ = _loc3_.x == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.canvas.silicon[_loc3_.x - 1][_loc3_.y]);
                  _loc11_ = _loc3_.x == this.canvas.width - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.canvas.silicon[_loc3_.x + 1][_loc3_.y]);
                  _loc12_ = _loc3_.y == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.canvas.silicon[_loc3_.x][_loc3_.y - 1]);
                  _loc13_ = _loc3_.y == this.canvas.height - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.canvas.silicon[_loc3_.x][_loc3_.y + 1]);
                  if(_loc3_.x == _loc4_.x && _loc10_ == _loc9_ && _loc11_ == _loc9_)
                  {
                     this.canvas.gateHorizontal[_loc3_.x][_loc3_.y] = true;
                     this.canvas.link[_loc3_.x][_loc3_.y] = false;
                     if(_loc4_.y < _loc3_.y)
                     {
                        this.canvas.siliconConnectedDown[_loc4_.x][_loc4_.y] = true;
                     }
                     else if(_loc4_.y > _loc3_.y)
                     {
                        this.canvas.siliconConnectedDown[_loc3_.x][_loc3_.y] = true;
                     }
                  }
                  else if(_loc3_.y == _loc4_.y && _loc12_ == _loc9_ && _loc13_ == _loc9_)
                  {
                     this.canvas.gateVertical[_loc3_.x][_loc3_.y] = true;
                     this.canvas.link[_loc3_.x][_loc3_.y] = false;
                     if(_loc4_.x < _loc3_.x)
                     {
                        this.canvas.siliconConnectedRight[_loc4_.x][_loc4_.y] = true;
                     }
                     else if(_loc4_.x > _loc3_.x)
                     {
                        this.canvas.siliconConnectedRight[_loc3_.x][_loc3_.y] = true;
                     }
                  }
               }
            }
         }
         if(this.tool == 1)
         {
            this.showMetal = true;
            if(!_loc5_)
            {
               this.canvas.metal[_loc3_.x][_loc3_.y] = true;
            }
            if(Boolean(_loc4_ != null) && Boolean(this.canvas.metal[_loc4_.x][_loc4_.y]) && Boolean(this.canvas.metal[_loc3_.x][_loc3_.y]))
            {
               if(_loc4_.x < _loc3_.x && _loc4_.y == _loc3_.y)
               {
                  this.canvas.metalConnectedRight[_loc4_.x][_loc4_.y] = true;
               }
               if(_loc4_.x > _loc3_.x && _loc4_.y == _loc3_.y)
               {
                  this.canvas.metalConnectedRight[_loc3_.x][_loc3_.y] = true;
               }
               if(_loc4_.y < _loc3_.y && _loc4_.x == _loc3_.x)
               {
                  this.canvas.metalConnectedDown[_loc4_.x][_loc4_.y] = true;
               }
               if(_loc4_.y > _loc3_.y && _loc4_.x == _loc3_.x)
               {
                  this.canvas.metalConnectedDown[_loc3_.x][_loc3_.y] = true;
               }
            }
         }
         if(this.tool == 2)
         {
            if(_loc5_)
            {
               return;
            }
            if(this.canvas.silicon[_loc3_.x][_loc3_.y] != Canvas.SILICON_NONE && this.canvas.gateVertical[_loc3_.x][_loc3_.y] == false && this.canvas.gateHorizontal[_loc3_.x][_loc3_.y] == false)
            {
               this.canvas.link[_loc3_.x][_loc3_.y] = true;
            }
         }
         if(this.tool == 4)
         {
            if(_loc5_)
            {
               return;
            }
            if(!this.alternate)
            {
               this.canvas.silicon[_loc3_.x][_loc3_.y] = Canvas.SILICON_NONE;
               this.canvas.gateVertical[_loc3_.x][_loc3_.y] = false;
               this.canvas.gateHorizontal[_loc3_.x][_loc3_.y] = false;
               this.canvas.link[_loc3_.x][_loc3_.y] = false;
               this.canvas.siliconConnectedRight[_loc3_.x][_loc3_.y] = false;
               this.canvas.siliconConnectedDown[_loc3_.x][_loc3_.y] = false;
               if(_loc3_.x > 0)
               {
                  this.canvas.siliconConnectedRight[_loc3_.x - 1][_loc3_.y] = false;
               }
               if(_loc3_.y > 0)
               {
                  this.canvas.siliconConnectedDown[_loc3_.x][_loc3_.y - 1] = false;
               }
            }
            else
            {
               this.canvas.metal[_loc3_.x][_loc3_.y] = Canvas.SILICON_NONE;
               this.canvas.metalConnectedRight[_loc3_.x][_loc3_.y] = false;
               this.canvas.metalConnectedDown[_loc3_.x][_loc3_.y] = false;
               if(_loc3_.x > 0)
               {
                  this.canvas.metalConnectedRight[_loc3_.x - 1][_loc3_.y] = false;
               }
               if(_loc3_.y > 0)
               {
                  this.canvas.metalConnectedDown[_loc3_.x][_loc3_.y - 1] = false;
               }
            }
         }
         if(this.tool == 3)
         {
            if(_loc5_)
            {
               return;
            }
            this.selectionEnd = _loc3_;
         }
         this.canvas.InvalidateBadGates();
      }
}
