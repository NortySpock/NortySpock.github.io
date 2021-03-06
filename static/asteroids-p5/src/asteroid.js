class Asteroid
{
    constructor(x,y,r)
    {
      if(x && y)
      {
        this.pos = createVector(x,y);
      }
      else //start asteroid on "random" edge
      {
        //x or y random position
        if(coinFlip())
        {
          this.pos = createVector(randomFromInterval(0,canvasWidth),0);
        }
        else
        {
          this.pos = createVector(0, randomFromInterval(0,canvasHeight));
        }
      }
      if(r)
      {
        this.r = r
      }
      else
      {
        this.r = 50;
      }
      //velocity and rotation
      this.maxvel = 3
      this.vel = createVector(randomFromInterval(-this.maxvel,this.maxvel),randomFromInterval(-this.maxvel,this.maxvel));
      this.rotation = 0; //radians
      this.rotationRate = radians(randomFromInterval(0,1)); //radians per frame


      this.destroyed = false;

      //randomize polygon shape
      this.polygonPoints = 3 + int(randomFromInterval(0,7));

      //used for making jaggy shaped asteroids
      this.pointOffsets = [this.polygonPoints];
      var offsetDelta = 0.5*this.r
      for(var i = 0; i < this.polygonPoints;i++)
      {
        this.pointOffsets[i] = randomFromInterval(-offsetDelta,offsetDelta)
      }

      //calculate collideRadius
      this.inradius	= this.r*cos(PI/this.polygonPoints);
      this.collideRadius = this.inradius;
    }

    render()
    {
        var scl = min(canvasHeight,canvasWidth) / 20;
        push();
        noFill();

        translate(this.pos.x,this.pos.y);
        rotate(this.rotation);

        if(!this.destroyed)
        {
            stroke(255);
        }

        strokeWeight(1);

        beginShape();
        for(var i = 0; i < this.polygonPoints; i++)
        {
          var angle = map(i,0,this.polygonPoints,0,TWO_PI); //converts from points to angle
          var sx = cos(angle) * (this.r + this.pointOffsets[i]);
          var sy = sin(angle) * (this.r + this.pointOffsets[i]);
          vertex(sx, sy);
        }
        endShape(CLOSE);
        pop();
    }

    update()
    {
      this.pos.add(this.vel);
      this.rotation += this.rotationRate;

      //appear on other edge if we go offscreen
      if(this.pos.x > canvasWidth)
      {
        this.pos.x = 0;
      }
      if(this.pos.x < 0)
      {
        this.pos.x = canvasWidth;
      }
      if(this.pos.y > canvasHeight)
      {
        this.pos.y = 0;
      }
      if(this.pos.y < 0)
      {
        this.pos.y = canvasHeight;
      }
    }

    checkCollision(x,y,radius)
    {
      if(radius)
      {
        return dist(this.pos.x,this.pos.y,x,y) <= (this.collideRadius + radius)
      }
      else
      {
        return dist(this.pos.x,this.pos.y,x,y) <= this.collideRadius
      }
    }

    smallerAsteroidSize()
    {
      return this.r * 0.4;
    }
}