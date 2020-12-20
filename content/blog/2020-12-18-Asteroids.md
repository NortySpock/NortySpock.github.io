<!-- title: Asteroids in P5.js-->
Back in 2018 I wrote an Asteroids clone using [P5.js](https://p5js.org/). (code is [here](https://github.com/NortySpock/asteroids-p5/), play it [here](https://nortyspock.github.io/asteroids-p5/).)   

The code was written in Javascript.    

I was inspired to create it mostly because I was tired of beating my head against the wall trying to come up with "the next big thing" to do for a side project.    

Additionally, I realized the following:   
- the classic video games of the '80s were small enough to be created by 1 person: all of the design, code, graphics, and sound were something that could be done in a few months to a year   <p>
- I'm happy as an enterprise software developer in my dayjob, but going home to do more enterprise software work was not going to be a fun hobby.    

Thus, making '80s video game clones might be a good way to keep me on my toes and coding interesting problems in my spare time.    

   
---------------------

  

Neat things I ran into working on this project:  <br/>

- I made a sound manager to keep track of all the sounds that should be played for a frame of the game 
  - Any time a sound needs to be played, the code calls a function in the sound manager and just pushes the name of the sound onto the queue. 
  - This nicely decoupled playing the sound from the main game loop.     
  - This could be further de-coupled into a global event queue but it wasn't needed for a game this small.    

- The best "feeling" bullets crossed the screen twice and then disappeared at the edges. It was not based on a time-of-flight or anything else, just how often it had crossed either the left-right wraparound or the up-down wraparound  <p>

- The ship had to have a custom offset for its center-of-rotation (center-of-gravity) to feel right    

- Using Array.splice to remove objects is adequate for getting started, but could be doing something like "creates a copy of the array minus what you are removing" to do so and thus is costing you 2n in terms of memory and n in terms of CPU time, and we'll see that come up in a later project.<p>
  - Different JavaScript engines handle it differently under the hood it seems, so take this with a grain of salt.
  - this ends up being "ok" for small lists but would get expensive if you had a lot of objects in the list, of course.  

Screenshot of the game:<p>
![screenshot of my asteroids clone](/pics/asteroids-p5-screenshot.png)

#### Footnotes:

Some suggested inspirational talks:  

- Ed Logg, original game developer  of Gauntlet talks about his game ([video link](https://www.youtube.com/watch?v=YbEw8J4pbC4))  
- "Failing to Fail: The Spiderweb Software Way"  with Jeff Vogel ([video link](https://www.youtube.com/watch?v=stxVBJem3Rs))  
- Jumpstarting Your Creativity: From Hobbyist to Professional by Tribe Games' Charles McGregor ([video link](https://www.youtube.com/watch?v=Zzxf9pWpWx4))  

Further quick looks at array splice performance by others: <p>
<a href="https://www.freecodecamp.org/news/lets-clear-up-the-confusion-around-the-slice-splice-split-methods-in-javascript-8ba3266c29ae/">https://www.freecodecamp.org/news/lets-clear-up-the-confusion-around-the-slice-splice-split-methods-in-javascript-8ba3266c29ae/</a> <p>
<a href="https://medium.com/javascript-in-plain-english/how-to-remove-a-specific-item-from-an-array-in-javascript-a49b108404c">https://medium.com/javascript-in-plain-english/how-to-remove-a-specific-item-from-an-array-in-javascript-a49b108404c</a> <p>
