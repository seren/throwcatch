var rotation = function (elementid){
    var angle = 0;
    setInterval(function(){
          angle+=3;
         $(elementid).rotate(angle);
    },50);
}
// rotation("#google");



toss_threshold = 800;

function Velocity_History () {
    var self = this;
    var velocity_history_max_size = 4;
    var v = [];
    var dx = [];
    var dy = [];
    var props = [ v, dx, dy ]

    self.velocity_average = function () {
        return average_array(v);
    }

    self.add = function (obj) {
        if ( obj.v ) { v.push( obj.v ) };
        if ( obj.dx ) { dx.push( obj.dx ) };
        if ( obj.dy ) { dy.push( obj.dy ) };
        for ( var i in props ) {
            if ( props[i].length > velocity_history_max_size ) {
                props[i].shift();
            }
        }
    }

    self.dx_average = function () {
        return average_array(dx);
    }

    self.dy_average = function () {
        return average_array(dy);
    }

    self.truncate = function () {
        for ( var i in props ) {
            props[i].pop();
        }
    }
}
velocity_history = new Velocity_History();


// Todo: turn this into a weighted average, so that the most recent readings have more weight
average_array = function (arr) {
    sum=0; var i=arr.length; while(i--) sum += arr[i]
    // console.log(sum);
    // console.log(arr.length);
    return Math.floor(sum/arr.length);
}

// target elements with the "draggable" class
interact('.draggable')
    // enable inertial throwing
    .inertia({
        resistance       : 1,    // the lambda in exponential decay
        minSpeed         : toss_threshold,   // target speed must be above this for inertia to start
        endSpeed         : 10,    // the speed at which inertia is slow enough to stop
        allowResume      : true,  // allow resuming an action in inertia phase
        zeroResumeDelta  : false, // if an action is resumed after launch, set dx/dy to 0
        smoothEndDuration: 300,   // animate to snap/restrict endOnly if there's no inertia

    })

    .draggable({
        onstart: function (event) {
            if ( event.target.marker ) {
                turn_marker_to_icon( event.target );
                // light_up_dropzones(); // todo
                // save_icon_position( event.target ); // todo
            }

        },
        onmove: function (event) {
            var target = event.target,
                // keep the dragged position in the data-x/data-y attributes
                x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            // translate the element
            target.style.webkitTransform =
            target.style.transform =
                'translate(' + x + 'px, ' + y + 'px)';

            // update the position attributes
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);


            // var textEl = event.target.querySelector('p');
            var textEl = $( '#readout span' );

            // Save recent velocity readings
            var obj = {
                v: parseInt( event.speed.toFixed(0), 10),
                dx: event.dx,
                dy: event.dy };
            velocity_history.add( obj );

            var toss = ( velocity_history.velocity_average() > toss_threshold );

            textEl && (textEl.text(
                'throw = '+ toss + '. Speed is ' + velocity_history.velocity_average() ));

            // Todo: change dragged-image angle to indicate tossing
            if (toss) {
                document.documentElement.style.cursor = 'pointer';
            } else {
                document.documentElement.style.cursor = 'move';
            }

            if ( at_edge(event) && event.interaction.inertiaStatus.active ) {
console.log (event);
console.log (event.interaction.inertiaStatus.active);
console.log (event.interaction.inertiaStatus.i);
                window.cancelAnimationFrame(event.interaction.inertiaStatus.i);
                event.interaction.inertiaStatus.active = false;
                event.interaction.stop();
                turn_icon_to_marker(event.target);
            }


        },
        // call this function on every dragend event
        onend: function (event) {
            var textEl = event.target.querySelector('p');

            // Remove the final 0 reading from the velocity history
            velocity_history.truncate();

            var toss = (  velocity_history.velocity_average() > toss_threshold );
            textEl && (textEl.textContent =
                            'Final velocity: ' +
                            velocity_history.velocity_average() + '.\nThrown = ' + toss );

            // hide_dropzones(); //todo
        }
    })
    // keep the element within the area of it's parent
    .restrict({
        drag: "parent",
        endOnly: false,
        elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    });


function at_edge (event) {
    if ( ( event.interaction.restrictStatus.dx != 0 ) || ( event.interaction.restrictStatus.dy != 0 ) ) {
        return true;
    }
}

function turn_icon_to_marker (target) {
    target.width = 45;
    target.height = 45;
    target.marker = true;
    // make_marker_float(target); //todo
}

function turn_marker_to_icon (target) {
    target.width = 94;
    target.height = 94;
    target.marker = false;
}

