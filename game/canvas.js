// Generated from Canvas.as by scripts/port.py.
import {Utility,Raster} from "./runtime.js";
export class Canvas {
static SILICON_NONE = 0;
static SILICON_N = 1;
static SILICON_P = 2;
static TILE_SILICON_N = 0;
static TILE_SILICON_P = 1;
static TILE_METAL = 2;
siliconHot = null;
metalConnectedRight = null;
metalConnectedDown = null;
bmpTileHot = "tile_hot";
metal = null;
height = 0;
gateActive = null;
mainCanvasLock = false;
bmpTileGate = new Array("tile_ng","tile_pg",null);
bmpTileAngle = new Array("tile_na","tile_pa","tile_ma");
bmpTileTee = new Array("tile_nt","tile_pt","tile_mt");
bmpTileBridge = new Array("tile_nb","tile_pb","tile_mb");
width = 0;
siliconConnectedRight = null;
siliconConnectedDown = null;
metalHot = null;
gateHorizontal = null;
silicon = null;
gateVertical = null;
bmpTileLink = "tile_link";
bmpTileStraight = new Array("tile_ns","tile_ps","tile_ms");
bmpTileDot = new Array("tile_nd","tile_pd","tile_md");
bmpTileJoint = new Array("tile_nj","tile_pj","tile_mj");
link = null;
bmpTileCap = new Array("tile_nc","tile_pc","tile_mc");
constructor(param1, param2) {
         
         this.width = param1;
         this.height = param2;
         this.silicon = Utility.Create2DArray(param1,param2,Canvas.SILICON_NONE);
         this.metal = Utility.Create2DArray(param1,param2,false);
         this.gateHorizontal = Utility.Create2DArray(param1,param2,false);
         this.gateVertical = Utility.Create2DArray(param1,param2,false);
         this.link = Utility.Create2DArray(param1,param2,false);
         this.siliconConnectedRight = Utility.Create2DArray(param1,param2,false);
         this.siliconConnectedDown = Utility.Create2DArray(param1,param2,false);
         this.metalConnectedRight = Utility.Create2DArray(param1,param2,false);
         this.metalConnectedDown = Utility.Create2DArray(param1,param2,false);
         this.siliconHot = Utility.Create2DArray(param1,param2,false);
         this.metalHot = Utility.Create2DArray(param1,param2,false);
         this.gateActive = Utility.Create2DArray(param1,param2,false);
      }
CopySelection(param1, param2, param3, param4) {
         var _loc5_ = null;
         var _loc6_ = 0;
         var _loc7_ = 0;
         if(param1 < 0 || param2 < 0 || param1 + param3 - 1 >= this.width || param2 + param4 - 1 >= this.height)
         {
            return null;
         }
         _loc5_ = new Canvas(param3,param4);
         _loc6_ = param1;
         while(_loc6_ < param1 + param3)
         {
            _loc7_ = param2;
            while(_loc7_ < param2 + param4)
            {
               _loc5_.silicon[_loc6_ - param1][_loc7_ - param2] = this.silicon[_loc6_][_loc7_];
               _loc5_.metal[_loc6_ - param1][_loc7_ - param2] = this.metal[_loc6_][_loc7_];
               _loc5_.gateHorizontal[_loc6_ - param1][_loc7_ - param2] = this.gateHorizontal[_loc6_][_loc7_];
               _loc5_.gateVertical[_loc6_ - param1][_loc7_ - param2] = this.gateVertical[_loc6_][_loc7_];
               _loc5_.link[_loc6_ - param1][_loc7_ - param2] = this.link[_loc6_][_loc7_];
               _loc5_.siliconConnectedRight[_loc6_ - param1][_loc7_ - param2] = this.siliconConnectedRight[_loc6_][_loc7_];
               _loc5_.siliconConnectedDown[_loc6_ - param1][_loc7_ - param2] = this.siliconConnectedDown[_loc6_][_loc7_];
               _loc5_.metalConnectedRight[_loc6_ - param1][_loc7_ - param2] = this.metalConnectedRight[_loc6_][_loc7_];
               _loc5_.metalConnectedDown[_loc6_ - param1][_loc7_ - param2] = this.metalConnectedDown[_loc6_][_loc7_];
               _loc7_++;
            }
            _loc6_++;
         }
         _loc6_ = 0;
         while(_loc6_ < param3)
         {
            _loc5_.siliconConnectedDown[_loc6_][param4 - 1] = false;
            _loc5_.metalConnectedDown[_loc6_][param4 - 1] = false;
            _loc6_++;
         }
         _loc7_ = 0;
         while(_loc7_ < param4)
         {
            _loc5_.siliconConnectedRight[param3 - 1][_loc7_] = false;
            _loc5_.metalConnectedRight[param3 - 1][_loc7_] = false;
            _loc7_++;
         }
         _loc5_.InvalidateBadGates();
         return _loc5_;
      }
InvalidateBadGates() {
         var _loc1_ = 0;
         var _loc2_ = 0;
         var _loc3_ = 0;
         var _loc4_ = 0;
         var _loc5_ = 0;
         var _loc6_ = 0;
         var _loc7_ = 0;
         var _loc8_ = 0;
         var _loc9_ = undefined;
         var _loc10_ = undefined;
         var _loc11_ = undefined;
         var _loc12_ = undefined;
         var _loc13_ = false;
         _loc1_ = 0;
         while(_loc1_ < this.width)
         {
            _loc2_ = 0;
            while(_loc2_ < this.height)
            {
               if(!(!this.gateHorizontal[_loc1_][_loc2_] && !this.gateVertical[_loc1_][_loc2_] || this.silicon[_loc1_][_loc2_] == Canvas.SILICON_NONE))
               {
                  _loc3_ = _loc1_ == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_ - 1][_loc2_]);
                  _loc4_ = _loc1_ == this.width - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_ + 1][_loc2_]);
                  _loc5_ = _loc2_ == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_][_loc2_ - 1]);
                  _loc6_ = _loc2_ == this.height - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_][_loc2_ + 1]);
                  _loc7_ = Math.trunc(this.silicon[_loc1_][_loc2_]);
                  _loc8_ = 3 - _loc7_;
                  _loc9_ = _loc2_ == 0 ? false : this.siliconConnectedDown[_loc1_][_loc2_ - 1];
                  _loc10_ = this.siliconConnectedDown[_loc1_][_loc2_];
                  _loc11_ = _loc1_ == 0 ? false : this.siliconConnectedRight[_loc1_ - 1][_loc2_];
                  _loc12_ = this.siliconConnectedRight[_loc1_][_loc2_];
                  _loc13_ = false;
                  if(this.gateHorizontal[_loc1_][_loc2_])
                  {
                     if(_loc3_ != _loc7_ || _loc4_ != _loc7_ || !_loc11_ || !_loc12_)
                     {
                        _loc13_ = true;
                     }
                     if((_loc5_ != _loc8_ || !_loc9_) && (_loc6_ != _loc8_ || !_loc10_))
                     {
                        _loc13_ = true;
                     }
                     if(Boolean(_loc5_ == _loc7_) && Boolean(_loc9_) || Boolean(_loc6_ == _loc7_) && Boolean(_loc10_))
                     {
                        _loc13_ = true;
                     }
                  }
                  if(this.gateVertical[_loc1_][_loc2_])
                  {
                     if(_loc5_ != _loc7_ || _loc6_ != _loc7_ || !_loc9_ || !_loc10_)
                     {
                        _loc13_ = true;
                     }
                     if((_loc3_ != _loc8_ || !_loc11_) && (_loc4_ != _loc8_ || !_loc12_))
                     {
                        _loc13_ = true;
                     }
                     if(Boolean(_loc3_ == _loc7_) && Boolean(_loc11_) || Boolean(_loc4_ == _loc7_) && Boolean(_loc12_))
                     {
                        _loc13_ = true;
                     }
                  }
                  if(_loc13_)
                  {
                     if(this.gateHorizontal[_loc1_][_loc2_])
                     {
                        this.gateHorizontal[_loc1_][_loc2_] = false;
                        if(_loc6_ != _loc7_)
                        {
                           this.siliconConnectedDown[_loc1_][_loc2_] = false;
                        }
                        if(_loc2_ > 0 && _loc5_ != _loc7_)
                        {
                           this.siliconConnectedDown[_loc1_][_loc2_ - 1] = false;
                        }
                     }
                     if(this.gateVertical[_loc1_][_loc2_])
                     {
                        this.gateVertical[_loc1_][_loc2_] = false;
                        if(_loc4_ != _loc7_)
                        {
                           this.siliconConnectedRight[_loc1_][_loc2_] = false;
                        }
                        if(_loc1_ > 0 && _loc3_ != _loc7_)
                        {
                           this.siliconConnectedRight[_loc1_ - 1][_loc2_] = false;
                        }
                     }
                  }
               }
               _loc2_++;
            }
            _loc1_++;
         }
      }
Copy() {
         var _loc1_ = null;
         var _loc2_ = 0;
         var _loc3_ = 0;
         _loc1_ = new Canvas(this.width,this.height);
         _loc2_ = 0;
         while(_loc2_ < this.width)
         {
            _loc3_ = 0;
            while(_loc3_ < this.height)
            {
               _loc1_.silicon[_loc2_][_loc3_] = this.silicon[_loc2_][_loc3_];
               _loc1_.metal[_loc2_][_loc3_] = this.metal[_loc2_][_loc3_];
               _loc1_.gateHorizontal[_loc2_][_loc3_] = this.gateHorizontal[_loc2_][_loc3_];
               _loc1_.gateVertical[_loc2_][_loc3_] = this.gateVertical[_loc2_][_loc3_];
               _loc1_.link[_loc2_][_loc3_] = this.link[_loc2_][_loc3_];
               _loc1_.siliconConnectedRight[_loc2_][_loc3_] = this.siliconConnectedRight[_loc2_][_loc3_];
               _loc1_.siliconConnectedDown[_loc2_][_loc3_] = this.siliconConnectedDown[_loc2_][_loc3_];
               _loc1_.metalConnectedRight[_loc2_][_loc3_] = this.metalConnectedRight[_loc2_][_loc3_];
               _loc1_.metalConnectedDown[_loc2_][_loc3_] = this.metalConnectedDown[_loc2_][_loc3_];
               _loc3_++;
            }
            _loc2_++;
         }
         _loc1_.mainCanvasLock = this.mainCanvasLock;
         return _loc1_;
      }
SimClearHot() {
         var _loc1_ = 0;
         var _loc2_ = 0;
         _loc1_ = 0;
         while(_loc1_ < this.width)
         {
            _loc2_ = 0;
            while(_loc2_ < this.height)
            {
               this.siliconHot[_loc1_][_loc2_] = false;
               this.metalHot[_loc1_][_loc2_] = false;
               _loc2_++;
            }
            _loc1_++;
         }
      }
DeleteSelection(param1, param2, param3, param4) {
         var _loc5_ = 0;
         var _loc6_ = 0;
         if(param1 < 0 || param2 < 0 || param1 + param3 - 1 >= this.width || param2 + param4 - 1 >= this.height)
         {
            return;
         }
         _loc5_ = param1;
         while(_loc5_ < param1 + param3)
         {
            _loc6_ = param2;
            while(_loc6_ < param2 + param4)
            {
               this.silicon[_loc5_][_loc6_] = Canvas.SILICON_NONE;
               this.metal[_loc5_][_loc6_] = false;
               this.gateHorizontal[_loc5_][_loc6_] = false;
               this.gateVertical[_loc5_][_loc6_] = false;
               this.link[_loc5_][_loc6_] = false;
               this.siliconConnectedRight[_loc5_][_loc6_] = false;
               this.siliconConnectedDown[_loc5_][_loc6_] = false;
               this.metalConnectedRight[_loc5_][_loc6_] = false;
               this.metalConnectedDown[_loc5_][_loc6_] = false;
               _loc6_++;
            }
            _loc5_++;
         }
         if(param2 > 0)
         {
            _loc5_ = param1;
            while(_loc5_ < param1 + param3)
            {
               this.siliconConnectedDown[_loc5_][param2 - 1] = false;
               this.metalConnectedDown[_loc5_][param2 - 1] = false;
               _loc5_++;
            }
         }
         if(param1 > 0)
         {
            _loc6_ = param2;
            while(_loc6_ < param2 + param4)
            {
               this.siliconConnectedRight[param1 - 1][_loc6_] = false;
               this.metalConnectedRight[param1 - 1][_loc6_] = false;
               _loc6_++;
            }
         }
         this.InvalidateBadGates();
      }
AddConnectionPads() {
         var _loc1_ = 0;
         if(this.mainCanvasLock)
         {
            _loc1_ = 2;
            while(_loc1_ <= 24)
            {
               if(_loc1_ % 4 != 1)
               {
                  this.metal[1][_loc1_] = true;
                  this.metalConnectedRight[1][_loc1_] = true;
                  this.metal[2][_loc1_] = true;
                  this.metalConnectedRight[2][_loc1_] = true;
                  this.metal[3][_loc1_] = true;
                  this.metal[40][_loc1_] = true;
                  this.metalConnectedRight[40][_loc1_] = true;
                  this.metal[41][_loc1_] = true;
                  this.metalConnectedRight[41][_loc1_] = true;
                  this.metal[42][_loc1_] = true;
                  if(_loc1_ % 4 != 0)
                  {
                     this.metalConnectedDown[1][_loc1_] = true;
                     this.metalConnectedDown[2][_loc1_] = true;
                     this.metalConnectedDown[3][_loc1_] = true;
                     this.metalConnectedDown[40][_loc1_] = true;
                     this.metalConnectedDown[41][_loc1_] = true;
                     this.metalConnectedDown[42][_loc1_] = true;
                  }
               }
               _loc1_++;
            }
         }
      }
SimSetHot(param1, param2, param3) {
         var _loc4_ = undefined;
         var _loc5_ = undefined;
         var _loc6_ = undefined;
         var _loc7_ = undefined;
         var _loc8_ = 0;
         var _loc9_ = 0;
         var _loc10_ = 0;
         var _loc11_ = 0;
         var _loc12_ = 0;
         var _loc13_ = 0;
         if((Boolean(this.gateHorizontal[param1][param2] || this.gateVertical[param1][param2])) && Boolean(!this.gateActive[param1][param2]) && !param3)
         {
            return;
         }
         if(param3 && Boolean(this.metalHot[param1][param2]))
         {
            return;
         }
         if(!param3 && Boolean(this.siliconHot[param1][param2]))
         {
            return;
         }
         if(param3 && Boolean(this.metal[param1][param2]))
         {
            this.metalHot[param1][param2] = true;
         }
         if(!param3 && this.silicon[param1][param2] != Canvas.SILICON_NONE)
         {
            this.siliconHot[param1][param2] = true;
         }
         if(param3)
         {
            _loc4_ = param2 == 0 ? false : this.metalConnectedDown[param1][param2 - 1];
            _loc5_ = this.metalConnectedDown[param1][param2];
            _loc6_ = param1 == 0 ? false : this.metalConnectedRight[param1 - 1][param2];
            _loc7_ = this.metalConnectedRight[param1][param2];
            if(_loc4_)
            {
               this.SimSetHot(param1,param2 - 1,true);
            }
            if(_loc5_)
            {
               this.SimSetHot(param1,param2 + 1,true);
            }
            if(_loc6_)
            {
               this.SimSetHot(param1 - 1,param2,true);
            }
            if(_loc7_)
            {
               this.SimSetHot(param1 + 1,param2,true);
            }
         }
         else
         {
            _loc8_ = param1 == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[param1 - 1][param2]);
            _loc9_ = param1 == this.width - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[param1 + 1][param2]);
            _loc10_ = param2 == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[param1][param2 - 1]);
            _loc11_ = param2 == this.height - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[param1][param2 + 1]);
            _loc12_ = Math.trunc(this.silicon[param1][param2]);
            _loc13_ = 3 - _loc12_;
            _loc4_ = param2 == 0 ? false : this.siliconConnectedDown[param1][param2 - 1];
            _loc5_ = this.siliconConnectedDown[param1][param2];
            _loc6_ = param1 == 0 ? false : this.siliconConnectedRight[param1 - 1][param2];
            _loc7_ = this.siliconConnectedRight[param1][param2];
            if(Boolean(_loc6_) && _loc8_ == _loc12_)
            {
               this.SimSetHot(param1 - 1,param2,false);
            }
            if(Boolean(_loc7_) && _loc9_ == _loc12_)
            {
               this.SimSetHot(param1 + 1,param2,false);
            }
            if(Boolean(_loc5_) && _loc11_ == _loc12_)
            {
               this.SimSetHot(param1,param2 + 1,false);
            }
            if(Boolean(_loc4_) && _loc10_ == _loc12_)
            {
               this.SimSetHot(param1,param2 - 1,false);
            }
         }
         if(this.link[param1][param2])
         {
            this.SimSetHot(param1,param2,!param3);
         }
      }
DrawTile(param1, param2, param3, param4, param5, param6, param7, param8) {
         var _loc9_ = 0;
         _loc9_ = 0;
         if(param3)
         {
            _loc9_ += 1;
         }
         if(param4)
         {
            _loc9_ += 2;
         }
         if(param5)
         {
            _loc9_ += 4;
         }
         if(param6)
         {
            _loc9_ += 8;
         }
         switch(_loc9_)
         {
            case 0:
               Raster.Blit(param1,this.bmpTileDot[param2],param7,param8);
               break;
            case 1:
               Raster.Blit(param1,this.bmpTileCap[param2],param7,param8,180);
               break;
            case 2:
               Raster.Blit(param1,this.bmpTileCap[param2],param7,param8,0);
               break;
            case 4:
               Raster.Blit(param1,this.bmpTileCap[param2],param7,param8,90);
               break;
            case 8:
               Raster.Blit(param1,this.bmpTileCap[param2],param7,param8,270);
               break;
            case 12:
               Raster.Blit(param1,this.bmpTileStraight[param2],param7,param8,0);
               break;
            case 3:
               Raster.Blit(param1,this.bmpTileStraight[param2],param7,param8,90);
               break;
            case 15:
               Raster.Blit(param1,this.bmpTileJoint[param2],param7,param8);
               break;
            case 14:
               Raster.Blit(param1,this.bmpTileTee[param2],param7,param8,180);
               break;
            case 13:
               Raster.Blit(param1,this.bmpTileTee[param2],param7,param8,0);
               break;
            case 11:
               Raster.Blit(param1,this.bmpTileTee[param2],param7,param8,90);
               break;
            case 7:
               Raster.Blit(param1,this.bmpTileTee[param2],param7,param8,270);
               break;
            case 9:
               Raster.Blit(param1,this.bmpTileAngle[param2],param7,param8,0);
               break;
            case 10:
               Raster.Blit(param1,this.bmpTileAngle[param2],param7,param8,90);
               break;
            case 6:
               Raster.Blit(param1,this.bmpTileAngle[param2],param7,param8,180);
               break;
            case 5:
               Raster.Blit(param1,this.bmpTileAngle[param2],param7,param8,270);
         }
      }
SimCacheGates() {
         var _loc1_ = 0;
         var _loc2_ = 0;
         var _loc3_ = 0;
         var _loc4_ = 0;
         var _loc5_ = 0;
         var _loc6_ = 0;
         var _loc7_ = 0;
         var _loc8_ = 0;
         var _loc9_ = undefined;
         var _loc10_ = undefined;
         var _loc11_ = undefined;
         var _loc12_ = undefined;
         var _loc13_ = undefined;
         var _loc14_ = undefined;
         var _loc15_ = undefined;
         var _loc16_ = undefined;
         _loc1_ = 0;
         while(_loc1_ < this.width)
         {
            _loc2_ = 0;
            while(_loc2_ < this.height)
            {
               if(this.silicon[_loc1_][_loc2_] != Canvas.SILICON_NONE && (Boolean(this.gateHorizontal[_loc1_][_loc2_]) || Boolean(this.gateVertical[_loc1_][_loc2_])))
               {
                  _loc3_ = _loc1_ == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_ - 1][_loc2_]);
                  _loc4_ = _loc1_ == this.width - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_ + 1][_loc2_]);
                  _loc5_ = _loc2_ == 0 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_][_loc2_ - 1]);
                  _loc6_ = _loc2_ == this.height - 1 ? Math.trunc(Canvas.SILICON_NONE) : Math.trunc(this.silicon[_loc1_][_loc2_ + 1]);
                  _loc7_ = Math.trunc(this.silicon[_loc1_][_loc2_]);
                  _loc8_ = 3 - _loc7_;
                  _loc9_ = _loc2_ == 0 ? false : this.siliconConnectedDown[_loc1_][_loc2_ - 1];
                  _loc10_ = this.siliconConnectedDown[_loc1_][_loc2_];
                  _loc11_ = _loc1_ == 0 ? false : this.siliconConnectedRight[_loc1_ - 1][_loc2_];
                  _loc12_ = this.siliconConnectedRight[_loc1_][_loc2_];
                  _loc13_ = _loc2_ == 0 ? false : this.siliconHot[_loc1_][_loc2_ - 1];
                  _loc14_ = _loc2_ == this.height - 1 ? false : this.siliconHot[_loc1_][_loc2_ + 1];
                  _loc15_ = _loc1_ == 0 ? false : this.siliconHot[_loc1_ - 1][_loc2_];
                  _loc16_ = _loc1_ == this.width - 1 ? false : this.siliconHot[_loc1_ + 1][_loc2_];
                  if(this.gateHorizontal[_loc1_][_loc2_])
                  {
                     if(_loc7_ == Canvas.SILICON_N)
                     {
                        if(Boolean(_loc5_ == _loc8_) && Boolean(_loc9_) && Boolean(_loc13_) || Boolean(_loc6_ == _loc8_) && Boolean(_loc10_) && Boolean(_loc14_))
                        {
                           this.gateActive[_loc1_][_loc2_] = true;
                        }
                     }
                     if(_loc7_ == Canvas.SILICON_P)
                     {
                        if(!(_loc5_ == _loc8_ && Boolean(_loc9_) && Boolean(_loc13_) || _loc6_ == _loc8_ && Boolean(_loc10_) && Boolean(_loc14_)))
                        {
                           this.gateActive[_loc1_][_loc2_] = true;
                        }
                     }
                  }
                  if(this.gateVertical[_loc1_][_loc2_])
                  {
                     if(_loc7_ == Canvas.SILICON_N)
                     {
                        if(Boolean(_loc3_ == _loc8_) && Boolean(_loc11_) && Boolean(_loc15_) || Boolean(_loc4_ == _loc8_) && Boolean(_loc12_) && Boolean(_loc16_))
                        {
                           this.gateActive[_loc1_][_loc2_] = true;
                        }
                     }
                     if(_loc7_ == Canvas.SILICON_P)
                     {
                        if(!(_loc3_ == _loc8_ && Boolean(_loc11_) && Boolean(_loc15_) || _loc4_ == _loc8_ && Boolean(_loc12_) && Boolean(_loc16_)))
                        {
                           this.gateActive[_loc1_][_loc2_] = true;
                        }
                     }
                  }
               }
               _loc2_++;
            }
            _loc1_++;
         }
      }
ScoreDesign() {
         var _loc1_ = 0;
         var _loc2_ = 0;
         var _loc3_ = 0;
         _loc3_ = 0;
         _loc1_ = 0;
         while(_loc1_ < this.width)
         {
            _loc2_ = 0;
            while(_loc2_ < this.height)
            {
               if(this.silicon[_loc1_][_loc2_] != Canvas.SILICON_NONE)
               {
                  _loc3_ += 1;
               }
               if(this.metal[_loc1_][_loc2_])
               {
                  _loc3_ += 1;
               }
               _loc2_++;
            }
            _loc1_++;
         }
         return _loc3_ - 108;
      }
SimClearGates() {
         var _loc1_ = 0;
         var _loc2_ = 0;
         _loc1_ = 0;
         while(_loc1_ < this.width)
         {
            _loc2_ = 0;
            while(_loc2_ < this.height)
            {
               this.gateActive[_loc1_][_loc2_] = false;
               _loc2_++;
            }
            _loc1_++;
         }
      }
Draw(param1, param2, param3, param4) {
         var _loc5_ = 0;
         var _loc6_ = 0;
         var _loc7_ = false;
         var _loc8_ = false;
         var _loc9_ = false;
         var _loc10_ = false;
         var _loc11_ = 0;
         _loc5_ = 0;
         while(_loc5_ < this.width)
         {
            _loc6_ = 0;
            while(_loc6_ < this.height)
            {
               if(this.silicon[_loc5_][_loc6_] != Canvas.SILICON_NONE)
               {
                  _loc7_ = _loc6_ == 0 ? false : Boolean(this.siliconConnectedDown[_loc5_][_loc6_ - 1]);
                  _loc8_ = Boolean(this.siliconConnectedDown[_loc5_][_loc6_]);
                  _loc9_ = _loc5_ == 0 ? false : Boolean(this.siliconConnectedRight[_loc5_ - 1][_loc6_]);
                  _loc10_ = Boolean(this.siliconConnectedRight[_loc5_][_loc6_]);
                  _loc11_ = this.silicon[_loc5_][_loc6_] == Canvas.SILICON_N ? Math.trunc(Canvas.TILE_SILICON_N) : Math.trunc(Canvas.TILE_SILICON_P);
                  this.DrawTile(param1,_loc11_,_loc7_,_loc8_,_loc9_,_loc10_,param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_);
                  if(_loc7_ && !this.gateHorizontal[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileBridge[_loc11_],param2 + 1 + 13 * _loc5_,param3 + 13 * _loc6_,0);
                  }
                  if(_loc8_)
                  {
                     Raster.Blit(param1,this.bmpTileBridge[_loc11_],param2 + 1 + 13 * _loc5_,param3 + 13 * _loc6_ + 13,0);
                  }
                  if(_loc9_ && !this.gateVertical[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileBridge[_loc11_],param2 + 13 * _loc5_ + 1,param3 + 13 * _loc6_ + 1,90);
                  }
                  if(_loc10_)
                  {
                     Raster.Blit(param1,this.bmpTileBridge[_loc11_],param2 + 13 * _loc5_ + 14,param3 + 13 * _loc6_ + 1,90);
                  }
                  if(this.gateHorizontal[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileGate[_loc11_],param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_,0);
                  }
                  if(this.gateVertical[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileGate[_loc11_],param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_,90);
                  }
                  if(this.link[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileLink,param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_);
                  }
                  if(this.siliconHot[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileHot,param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_);
                  }
               }
               if(Boolean(this.metal[_loc5_][_loc6_]) && param4)
               {
                  _loc7_ = _loc6_ == 0 ? false : Boolean(this.metalConnectedDown[_loc5_][_loc6_ - 1]);
                  _loc8_ = Boolean(this.metalConnectedDown[_loc5_][_loc6_]);
                  _loc9_ = _loc5_ == 0 ? false : Boolean(this.metalConnectedRight[_loc5_ - 1][_loc6_]);
                  _loc10_ = Boolean(this.metalConnectedRight[_loc5_][_loc6_]);
                  this.DrawTile(param1,Canvas.TILE_METAL,_loc7_,_loc8_,_loc9_,_loc10_,param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_);
                  if(_loc7_)
                  {
                     Raster.Blit(param1,this.bmpTileBridge[Canvas.TILE_METAL],param2 + 1 + 13 * _loc5_,param3 + 13 * _loc6_,0);
                  }
                  if(_loc9_)
                  {
                     Raster.Blit(param1,this.bmpTileBridge[Canvas.TILE_METAL],param2 + 13 * _loc5_ + 1,param3 + 13 * _loc6_ + 1,90);
                  }
                  if(this.metalHot[_loc5_][_loc6_])
                  {
                     Raster.Blit(param1,this.bmpTileHot,param2 + 1 + 13 * _loc5_,param3 + 1 + 13 * _loc6_);
                  }
               }
               _loc6_++;
            }
            _loc5_++;
         }
      }
Paste(param1, param2, param3) {
         var _loc4_ = 0;
         var _loc5_ = 0;
         var _loc6_ = undefined;
         if(param1 < 0 || param2 < 0 || param1 + param3.width - 1 >= this.width || param2 + param3.height - 1 >= this.height)
         {
            return false;
         }
         _loc4_ = param1;
         while(_loc4_ < param1 + param3.width)
         {
            _loc5_ = param2;
            while(_loc5_ < param2 + param3.height)
            {
               _loc6_ = this.mainCanvasLock && (_loc4_ < 4 || _loc4_ >= 40);
               if(param3.silicon[_loc4_ - param1][_loc5_ - param2] != Canvas.SILICON_NONE && (Boolean(this.silicon[_loc4_][_loc5_] != Canvas.SILICON_NONE) || Boolean(_loc6_)))
               {
                  return false;
               }
               if(Boolean(param3.metal[_loc4_ - param1][_loc5_ - param2]) && (Boolean(this.metal[_loc4_][_loc5_]) || Boolean(_loc6_)))
               {
                  return false;
               }
               _loc5_++;
            }
            _loc4_++;
         }
         _loc4_ = param1;
         while(_loc4_ < param1 + param3.width)
         {
            _loc5_ = param2;
            while(_loc5_ < param2 + param3.height)
            {
               if(param3.silicon[_loc4_ - param1][_loc5_ - param2] != Canvas.SILICON_NONE)
               {
                  this.silicon[_loc4_][_loc5_] = param3.silicon[_loc4_ - param1][_loc5_ - param2];
                  this.gateHorizontal[_loc4_][_loc5_] = param3.gateHorizontal[_loc4_ - param1][_loc5_ - param2];
                  this.gateVertical[_loc4_][_loc5_] = param3.gateVertical[_loc4_ - param1][_loc5_ - param2];
                  this.link[_loc4_][_loc5_] = param3.link[_loc4_ - param1][_loc5_ - param2];
                  this.siliconConnectedRight[_loc4_][_loc5_] = param3.siliconConnectedRight[_loc4_ - param1][_loc5_ - param2];
                  this.siliconConnectedDown[_loc4_][_loc5_] = param3.siliconConnectedDown[_loc4_ - param1][_loc5_ - param2];
               }
               if(param3.metal[_loc4_ - param1][_loc5_ - param2])
               {
                  this.metal[_loc4_][_loc5_] = param3.metal[_loc4_ - param1][_loc5_ - param2];
                  this.metalConnectedRight[_loc4_][_loc5_] = param3.metalConnectedRight[_loc4_ - param1][_loc5_ - param2];
                  this.metalConnectedDown[_loc4_][_loc5_] = param3.metalConnectedDown[_loc4_ - param1][_loc5_ - param2];
               }
               _loc5_++;
            }
            _loc4_++;
         }
         this.InvalidateBadGates();
         return true;
      }
}
