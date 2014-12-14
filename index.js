// for coordination between interact functions (eg. dragging and droping)
var globalaction = "";
var justDroppedOnZone = false;
toss_threshold = 800;
var velocity_history = new Velocity_History();
// gotta keep track of the active zones because interacte().dropzone deactivates them before we can check their classes
var last_active_zone = null;



function angle_from_xy (x, y) {
    angle = 180 * Math.atan2(y, x) / Math.PI;
    return angle;
};

// extract the zone type from the class name
function zoneTypeFromZone (zone) {
    var r = /(.*)-zone/;
    classes = zone.classList;
    for (var i = 0, len = classes.length; i < len; i++) {
        if ( r.test(classes[i]) ) {
            zone_type = r.exec(classes[i])[1];
            return zone_type;
        }
    }
    return false;
}

// determines if the marker stopped over zone when thrown (unfortunately we have a bug
//   when throwing over drop zones from forcing the inertia to end)
function was_over_visible_zone (event) {
    x = event.x0 + event.dx;
    y = event.y0 + event.dy;
    z = last_active_zone;
    if ( z ) {
        zX0 = z.offsetLeft;
        zX1 = z.offsetLeft + z.offsetWidth;
        zY0 = z.offsetTop;
        zY1 = z.offsetTop + z.offsetHeight;
    console.log('zid:'+z.id+' z:'+zX0+','+zX1+','+zY0+','+zY1);
        if ( ( x > zX0 ) && ( x < zX1 ) &&
             ( y > zY0 ) && ( y < zY1) ) {
            zone_type = zoneTypeFromZone(z);
            if ( zone_type ) {
                console.log('on zone "'+z.id+'", type: '+zone_type);
                return zone_type;
            } else {
                alert("no zone_type found");
            }
    alert('on zone "'+z.id+'"');
        }
    }
console.log('not on zone, x'+x+' y'+y+' dx'+event.dx+' dy'+event.dy);
    return false;
}

// this actually does the work of the activated zone
function activate_zone_function (marker, zone_name) {
// console.log("marker" + marker);
// console.log("zone_name" + zone_name);
    globalaction = zone_name;
    var cases = {
        copy: function() {
            console.log("copying");
            old_img = $('#'+marker.id)
            new_img = $('#'+marker.id).clone().appendTo('.demo-area');
            new_img[0].id = (new Date()).getTime().toString();
        },
        cancel: function() {
            console.log("canceling");

            style = 'translate(' + marker.originalX + 'px, ' + marker.originalY + 'px)';
            target.style.webkitTransform =
            target.style.transform =
                style;

            turn_marker_to_icon(marker);
            // set the marker to icon and change coords back to original
        },
        delete: function() {
            console.log("deleting");
            console.log(marker);
            marker.style.display="none";
        },
        _default: function() { alert('zone_name "'+zone_name+'" is not a valid name'); }
    };
    cases[ zone_name ] ? cases[ zone_name ]() : cases._default();
}














// Todo: turn this into a weighted average, so that the most recent readings have more weight
average_array = function (arr) {
    sum=0; var i=arr.length; while(i--) sum += arr[i]
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
            target = event.target;
            justDroppedOnZone = false;
            if ( target.classList.contains('marker') != true ) {
                // store initial coordinates in case the throw-catch is canceled
                target.originalX = (parseFloat(target.getAttribute('data-x')) || 0) + target.x,
                target.originalY = (parseFloat(target.getAttribute('data-y')) || 0) + target.y;
            }
        },
        onmove: function (event) {
            var target = event.target,
                // keep the dragged position in the data-x/data-y attributes
                x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

            // translate the element
            style = 'translate(' + x + 'px, ' + y + 'px)';

            // update the position attributes
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);


            // Save recent velocity readings
            var obj = {
                v: parseInt( event.speed.toFixed(0), 10),
                dx: event.dx,
                dy: event.dy };
            velocity_history.add( obj );

            var throwing = ( velocity_history.velocity_average() > toss_threshold );

            // Todo: change dragged-image angle to indicate throwing
            if (throwing) {
                document.documentElement.style.cursor = 'pointer';
            } else {
                document.documentElement.style.cursor = 'move';
            }

            if ( throwing || event.interaction.inertiaStatus.active ) {
                style = style + " rotate(" +
                    ( angle_from_xy( velocity_history.dx_average(), velocity_history.dy_average() ) + 90 ) +
                    "deg)";
            }


            target.style.webkitTransform =
            target.style.transform =
                style;

            // todo: The method of aborting the inertia is causing errors in Interaction.inertiaFrame (there's an Interaction without a target being inertially processed)
            if ( at_edge(event) && event.interaction.inertiaStatus.active ) {
                event.interaction.stop();
                event.interaction.inertiaStatus.active = false;
                window.cancelAnimationFrame(event.interaction.inertiaStatus.i);
                turn_icon_to_marker(event.target);
                deactivate_all_zones();

                // reset_location(event.target);
            }


        },
        // call this function on every dragend event
        onend: function (event) {
            zone = was_over_visible_zone( event );
            if ( zone ) {
                justDroppedOnZone = true;
                activate_zone_function(event.target, zone);
            }
            if ( justDroppedOnZone == false ) {
                var textEl = event.target.querySelector('p');

                // Remove the final 0 reading from the velocity history
                velocity_history.truncate();

                if ( event.target.classList.contains('marker') ) {
                    turn_marker_to_icon( event.target );
                };
            }
console.log('drag ended');
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
// console.log(target);
    target.classList.add('marker');
    target.classList.remove('icon');
    // make_marker_float(target); //todo
}

function turn_marker_to_icon (target) {
// console.log(target);
    target.classList.add('icon');
    target.classList.remove('marker');
}

function deactivate_all_zones () {
console.log('deactivate_all_zones');
    divs = $('#basic-drag div')
    for ( var i = 0, len = divs.length; i < len; i++) {
        d=divs[i]
        d.classList.remove('drop-active');
        d.classList.remove('drop-target');
        d.classList.add('drop-inactive');
    }
}















function genericOndropactivate (event) {
console.log(event.target);
    event.target.classList.add('drop-active');
    event.target.classList.remove('drop-inactive');
}

function genericOndragenter (event) {
console.log("entered zone");
    var draggableElement = event.relatedTarget,
        dropzoneElement = event.target;
    dropzoneElement.classList.add('drop-target');
    last_active_zone = dropzoneElement;
}

function genericOndragleave (event) {
    event.target.classList.remove('drop-target');
}

function genericOndrop (event) {
    justDroppedOnZone = true;
console.log("dropped on zone (according to zone func)");
    //   taken care of by the drop function
    // activate_zone_function(event.relatedTarget, event.target)
}

function genericOndropdeactivate (event) {
    event.target.classList.remove('drop-active');
    event.target.classList.remove('drop-target');
    event.target.classList.add('drop-inactive');
}




interact('.cancel-zone').dropzone({
    accept: '.marker',
    ondropactivate: function (event) { genericOndropactivate(event); },
    ondragenter: function (event) {genericOndragenter(event); },
    ondragleave: function (event) {genericOndragleave(event); },
    ondrop: function (event) {genericOndrop(event); },
    ondropdeactivate: function (event) {genericOndropdeactivate(event); }
});


interact('.delete-zone').dropzone({
    accept: '.icon',
    ondropactivate: function (event) { genericOndropactivate(event); },
    ondragenter: function (event) {genericOndragenter(event); },
    ondragleave: function (event) {genericOndragleave(event); },
    ondrop: function (event) {genericOndrop(event); },
    ondropdeactivate: function (event) {genericOndropdeactivate(event); }
});

interact('.copy-zone').dropzone({
    accept: '.marker',
    ondropactivate: function (event) { genericOndropactivate(event); },
    ondragenter: function (event) {genericOndragenter(event); },
    ondragleave: function (event) {genericOndragleave(event); },
    ondrop: function (event) {genericOndrop(event); },
    ondropdeactivate: function (event) {genericOndropdeactivate(event); }
});




















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
