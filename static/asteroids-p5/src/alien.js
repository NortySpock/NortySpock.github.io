class Alien
{
    constructor()
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

        this.vel = createVector(0,0);
        this.maxHealth = 3 + (millis()/1000/60); //1 + number of minutes you have been playing
        this.health = int(this.maxHealth);
        this.cyan = color(0,255,255);
        this.magenta = color(255,0,255);
        this.color = this.magenta;
        this.cloak_timer = 0;
        this.max_cloak_time_millis=3000;
        this.show_timer = 0;
        this.gun_warmup_timer = 0;
        this.scl = min(canvasHeight,canvasWidth) / 23;
        this.collideRadius = this.scl;
        this.deleteFlag = false;
        this.accelRate = 0.75;
        this.maxSpeed = 2;
        this.patrolMinApproach = 0;

        this.angry = false;

        this.patrolPoint1 = createVector(randomFromInterval(0,canvasWidth),randomFromInterval(0,canvasHeight));

        //create second patrol point at the center
        this.patrolPoint2 =  createVector(canvasWidth/2, canvasHeight/2);

        this.targetPoint = this.patrolPoint1;

        this.deathRayMaxRange = this.scl*2.5;
        this.deathRayWidth = 10;
        this.deathRaySpreadMin = 10; //degrees
        this.deathRaySpreadMax = 15; //degrees
    }

    render()
    {
      push();
      fill(0);
      stroke(this.color);
      ellipse(this.pos.x, this.pos.y, this.scl*2, this.scl);
      var subScl = this.scl/4;
      line(this.pos.x+subScl,this.pos.y-subScl, this.pos.x-subScl,this.pos.y-subScl)
      line(this.pos.x-subScl,this.pos.y-subScl, this.pos.x-subScl,this.pos.y+subScl)
      line(this.pos.x+subScl,this.pos.y-subScl, this.pos.x+subScl,this.pos.y+subScl)
      point(this.pos.x, this.pos.y);

      //draw deathray
      if(this.angry)
      {
        var deathRaySpread = randomFromInterval(this.deathRaySpreadMin,this.deathRaySpreadMax);
        var targetHeading = atan2(ship.pos.y - this.pos.y, ship.pos.x - this.pos.x);
        var midpoint = createVector((ship.pos.x+this.pos.x)/2,(ship.pos.y+this.pos.y)/2);

        stroke(this.cyan);
        noFill()
        //ellipse(this.pos.x,this.pos.y,this.deathRayMaxRange); //mock out max range
        fill(this.cyan);

        var plusDeathRayPoint = p5.Vector.fromAngle(targetHeading+radians(deathRaySpread));
        plusDeathRayPoint.normalize();
        plusDeathRayPoint.mult(this.deathRayMaxRange-this.scl);
        plusDeathRayPoint.add(this.pos);

        var minusDeathRayPoint = p5.Vector.fromAngle(targetHeading-radians(deathRaySpread));
        minusDeathRayPoint.normalize();
        minusDeathRayPoint.mult(this.deathRayMaxRange-this.scl);
        minusDeathRayPoint.add(this.pos);

        triangle(this.pos.x,this.pos.y,plusDeathRayPoint.x,plusDeathRayPoint.y, minusDeathRayPoint.x,minusDeathRayPoint.y);
      }
      pop();
    }

    update()
    {
      if(!this.angry)
      {
        //got close enough to patrol point, switch
        if(this.checkCollision(this.targetPoint.x,this.targetPoint.y,this.patrolMinApproach))
        {
          if(this.targetPoint == this.patrolPoint1)
          {
            this.targetPoint = this.patrolPoint2;
          }
          else
          {
            this.targetPoint = this.patrolPoint1;
          }
        }
        //move towards patrol point
        this.graviticPull(this.targetPoint);

      } else
      {
        this.targetPoint = ship.pos;
        this.graviticPull(this.targetPoint);
        this.deathRayWidth = randomFromInterval(1,5);
      }

      this.vel = this.vel.limit(this.maxSpeed); //speed limiter
      this.pos.add(this.vel);

      this.handleGoingOffscreen();
    }

    checkCollision(x,y,radius)
    {
      var collide1, collide2;
      if(radius)
      {
        collide1 = dist(this.pos.x,this.pos.y,x,y) <= (this.collideRadius + radius)
        collide2 = dist(this.pos.x+(this.scl),this.pos.y,x,y) <= (this.collideRadius + radius)

      }
      else
      {
        collide1 = dist(this.pos.x,this.pos.y,x,y) <= (this.collideRadius)
        collide2 = dist(this.pos.x+(this.scl),this.pos.y,x,y) <= (this.collideRadius)
      }
      return collide1 ||  collide2;
    }

    changeColorPreservingAlpha(colorIn)
    {
      this.color = color(red(colorIn), green(colorIn),blue(colorIn),alpha(this.color));
    }

    decrementColor()
    {
      var darkenAmount = 255/(this.maxHealth);
      var newAlpha = Math.max(0,alpha(this.color)-darkenAmount);
      this.color = color(red(this.color), green(this.color),blue(this.color),newAlpha);
    }

    graviticPull(targetPoint)
    {
      var targetAccelVector = p5.Vector.sub(targetPoint,this.pos)
      targetAccelVector.normalize();
      targetAccelVector.mult(this.accelRate);
      this.vel.add(targetAccelVector);
    }

    hit()
    {
        this.decrementColor();

        this.health -= 1;
        if(this.health <= 0)
        {
          this.deleteFlag = true;
          points += 1000
        }

        //get angry
        this.getAngry();
    }

    getAngry()
    {
      if(!this.angry)
      {
        this.angry = true;
        this.changeColorPreservingAlpha(this.cyan);
      }
    }

    lineCrossed()
    {
      return false;
    }

    calm()
    {
      this.angry = false;
      this.changeColorPreservingAlpha(this.magenta);
    }

    handleGoingOffscreen()
    {
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
}
