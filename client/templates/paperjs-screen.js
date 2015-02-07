var EDITING_KEY = 'editingList';
Session.setDefault(EDITING_KEY, false);
paper.install(window);

// Track if this is the first time the list template is rendered
var firstRender = true;
var listRenderHold = LaunchScreen.hold();
listFadeInHold = null;
var listIdA;

Template.paperjsScreen.rendered = function() {

    if (firstRender) {
        // Released in app-body.js
        listFadeInHold = LaunchScreen.hold();

        // Handle for launch screen defined in app-body.js
        listRenderHold.release();

        firstRender = false;
    }

    window.onload = function () {

        var Point = {

            addPoints : function(a, b) {
                return new paper.Point(a.x + b.x, a.y + b.y);
            },

            subtractPoints : function(a, b) {
                return new paper.Point(a.x - b.x, a.y - b.y);
            },

            multiple : function(a, b) {
                return new paper.Point(a.x * b, a.y * b);
            },

            divide : function(a, b) {
                return new paper.Point(a.x / b, a.y / b);
            },

            add : function(a, b) {
                return new paper.Point(a.x + b, a.y + b);
            },

            subtract : function(a, b) {
                return new paper.Point(a.x - b, a.y - b);
            }
        };

        // Get a reference to the canvas object
        var canvas = document.getElementById('canvas');
        paper.setup(canvas);

        var Boid = paper.Base.extend({
            initialize: function(position, maxSpeed, maxForce, idea) {
                var strength = Math.random() * 0.5;
                this.acceleration = new paper.Point();
                this.idea = idea;
                this.vector = Point.multiple(paper.Point.random(), 2);
                this.vector = Point.subtract(this.vector, 1);
                this.position = position.clone();
                this.radius = 30;
                this.maxSpeed = maxSpeed + strength;
                this.maxForce = maxForce + strength;
                this.amount = strength * 10 + 10;
                this.count = 0;
                this.createItems();
            },

            run: function(boids) {
                this.lastLoc = this.position.clone();
                if (!groupTogether) {
                    this.flock(boids);
                } else {
                    this.align(boids);
                }
                this.borders();
                this.update();
                this.calculateTail();
                this.moveHead();
            },

            calculateTail: function() {
                var segments = this.path.segments,
                    shortSegments = this.shortPath.segments;
                var speed = this.vector.length;
                var pieceLength = 5 + speed / 3;
                var point = this.position;
                segments[0].point = shortSegments[0].point = point;
                // Chain goes the other way than the movement
                var lastVector = Point.multiple(this.vector, -1);
                for (var i = 1; i < this.amount; i++) {
                    var vector = Point.subtractPoints(segments[i].point, point);
                    this.count += speed * 10;
                    var wave = Math.sin((this.count + i * 3) / 300);
                    var sway = lastVector.rotate(90).normalize(wave);
                    var normalizedSway = Point.addPoints(lastVector.normalize(pieceLength), sway);
                    point = Point.addPoints(point, normalizedSway);
                    normalizedSway = Point.addPoints(lastVector.normalize(pieceLength), sway);
                    point = Point.addPoints(point, normalizedSway);
                    segments[i].point = point;
                    if (i < 3)
                        shortSegments[i].point = point;
                    lastVector = vector;
                }
                this.path.smooth();
            },

            createItems: function() {

                this.head = new paper.Shape.Ellipse({
                    //center: [0, 0],
                    //size: [0, 0],
                    //fillColor: 'black'
                });

                this.path = new paper.Path({
                    //strokeColor: 'black',
                    //strokeWidth: 2,
                    //strokeCap: 'round'
                });
                for (var i = 0; i < this.amount; i++)
                    this.path.add(new paper.Point());

                this.shortPath = new paper.Path({
                    //strokeColor: 'black',
                    //strokeWidth: 4,
                    //strokeCap: 'round'
                });

                this.text = new paper.PointText(new paper.Point());
                this.text.fillColor = 'black';
                this.text.content = this.idea;
                this.text.fontSize = "12px";

                for (var i = 0; i < Math.min(3, this.amount); i++)
                    this.shortPath.add(new paper.Point());
            },

            moveHead: function() {
                this.head.position = this.position;
                this.text.position = this.position;
                this.head.rotation = this.vector.angle;
                this.text.rotation = this.vector.angle;
            },

            // We accumulate a new acceleration each time based on three rules
            flock: function(boids) {
                var separation = Point.multiple(this.separate(boids), 3);
                var alignment = this.align(boids);
                var cohesion = this.cohesion(boids);
                this.acceleration = Point.addPoints(Point.addPoints(this.acceleration, separation), Point.addPoints(alignment, cohesion));
            },

            update: function() {
                // Update velocity
                this.vector = Point.addPoints(this.vector, this.acceleration);
                // Limit speed (vector#limit?)
                this.vector.length = Math.min(this.maxSpeed, this.vector.length);
                this.position = Point.addPoints(this.position, this.vector);
                // Reset acceleration to 0 each cycle
                this.acceleration = new paper.Point();
            },

            seek: function(target) {
                this.acceleration = Point.addPoints(this.acceleration, this.steer(target, false));
            },

            arrive: function(target) {
                this.acceleration = Point.addPoints(this.acceleration, this.steer(target, true));
            },

            borders: function() {
                var vector = new paper.Point();
                var position = this.position;
                var radius = this.radius;
                var size = paper.view.size;
                if (position.x < -radius) vector.x = size.width + radius;
                if (position.y < -radius) vector.y = size.height + radius;
                if (position.x > size.width + radius) vector.x = -size.width - radius;
                if (position.y > size.height + radius) vector.y = -size.height - radius;
                if (!vector.isZero()) {
                    this.position = Point.addPoints(this.position, vector);
                    var segments = this.path.segments;
                    for (var i = 0; i < this.amount; i++) {
                        segments[i].point = Point.addPoints(segments[i].point, vector);
                    }
                }
            },

            // A method that calculates a steering vector towards a target
            // Takes a second argument, if true, it slows down as it approaches
            // the target
            steer: function(target, slowdown) {
                var steer, desired = Point.subtractPoints(target, this.position);
                var distance = desired.length;
                // Two options for desired vector magnitude
                // (1 -- based on distance, 2 -- maxSpeed)
                if (slowdown && distance < 100) {
                    // This damping is somewhat arbitrary:
                    desired.length = this.maxSpeed * (distance / 100);
                } else {
                    desired.length = this.maxSpeed;
                }
                steer = Point.subtractPoints(desired, this.vector);
                steer.length = Math.min(this.maxForce, steer.length);
                return steer;
            },


            separate: function(boids) {
                var desiredSeperation = 60;
                var steer = new paper.Point();
                var count = 0;
                // For every boid in the system, check if it's too close
                for (var i = 0, l = boids.length; i < l; i++) {
                    var other = boids[i];
                    var vector = Point.subtractPoints(this.position, other.position);
                    var distance = vector.length;
                    if (distance > 0 && distance < desiredSeperation) {
                        // Calculate vector pointing away from neighbor
                        steer = Point.addPoints(steer, vector.normalize(1 / distance));
                        count++;
                    }
                }
                // Average -- divide by how many
                if (count > 0) {
                    steer = Point.divide(steer, count);
                }
                if (!steer.isZero()) {
                    // Implement Reynolds: Steering = Desired - Velocity
                    steer.length = this.maxSpeed;
                    steer = Point.subtractPoints(steer, this.vector);
                    steer.length = Math.min(steer.length, this.maxForce);
                }
                return steer;
            },

            // Alignment
            // For every nearby boid in the system, calculate the average velocity
            align: function(boids) {
                var neighborDist = 25;
                var steer = new paper.Point();
                var count = 0;
                for (var i = 0, l = boids.length; i < l; i++) {
                    var other = boids[i];
                    var distance = this.position.getDistance(other.position);
                    if (distance > 0 && distance < neighborDist) {
                        steer = Point.addPoints(steer, other.vector);
                        count++;
                    }
                }

                if (count > 0)
                    steer = Point.divide(steer, count);

                if (!steer.isZero()) {
                    // Implement Reynolds: Steering = Desired - Velocity
                    steer.length = this.maxSpeed;
                    steer = Point.subtractPoints(steer, this.vector);
                    steer.length = Math.min(steer.length, this.maxForce);
                }
                return steer;
            },

            // Cohesion
            // For the average location (i.e. center) of all nearby boids,
            // calculate steering vector towards that location
            cohesion: function(boids) {
                var neighborDist = 100;
                var sum = new paper.Point();
                var count = 0;
                for (var i = 0, l = boids.length; i < l; i++) {
                    var other = boids[i];
                    var distance = this.position.getDistance(other.position);
                    if (distance > 0 && distance < neighborDist) {
                        sum = Point.addPoints(sum, other.position); // Add location
                        count++;
                    }
                }
                if (count > 0) {
                    sum = Point.divide(sum, count);
                    // Steer towards the location
                    return this.steer(sum, false);
                }
                return sum;
            }
        });

        ///////////////////////////////////////////////////////////////////////////

        var heartPath = new paper.Path('M514.69629,624.70313c-7.10205,-27.02441 -17.2373,-52.39453 -30.40576,-76.10059c-13.17383,-23.70703 -38.65137,-60.52246 -76.44434,-110.45801c-27.71631,-36.64355 -44.78174,-59.89355 -51.19189,-69.74414c-10.5376,-16.02979 -18.15527,-30.74951 -22.84717,-44.14893c-4.69727,-13.39893 -7.04297,-26.97021 -7.04297,-40.71289c0,-25.42432 8.47119,-46.72559 25.42383,-63.90381c16.94775,-17.17871 37.90527,-25.76758 62.87354,-25.76758c25.19287,0 47.06885,8.93262 65.62158,26.79834c13.96826,13.28662 25.30615,33.10059 34.01318,59.4375c7.55859,-25.88037 18.20898,-45.57666 31.95215,-59.09424c19.00879,-18.32178 40.99707,-27.48535 65.96484,-27.48535c24.7373,0 45.69531,8.53564 62.87305,25.5957c17.17871,17.06592 25.76855,37.39551 25.76855,60.98389c0,20.61377 -5.04102,42.08691 -15.11719,64.41895c-10.08203,22.33203 -29.54687,51.59521 -58.40723,87.78271c-37.56738,47.41211 -64.93457,86.35352 -82.11328,116.8125c-13.51758,24.0498 -23.82422,49.24902 -30.9209,75.58594z');

        var boids = [];
        var groupTogether = false;

        Todos.find({listId: listIdA}, {sort: {createdAt : -1}}).map(function(todo, index) {
            todo.index = index;
            var position = new paper.Point(paper.Point.random().x * paper.view.size._width, paper.Point.random().x * paper.view.size._height);
            boids.push(new Boid(position, 2, 0.01, todo.text));
        });

        var tool = new paper.Tool();

        //var ideas = project.importSVG(document.getElementById('svg'));
        //ideas.visible = true; // Turn off the effect of display:none;
        //ideas.fillColor = 'black';
        //ideas.strokeColor = 'black';

        // Imported SVG Groups have their applyMatrix flag turned off by
        // default. This is required for SVG importing to work correctly. Turn
        // it on now, so we don't have to deal with nested coordinate spaces.

        //for (var index = 0; index < ideas.children.length; ++index) {
        //    ideas.children[index].applyMatrix = true;
        //}

        // Resize the words to fit snugly inside the view:
        //project.activeLayer.fitBounds(view.bounds);
        //project.activeLayer.scale(0.5);

        var tool = new Tool();

        //tool.onMouseMove = function(event) {
        //    noGroup.position = event.point;
        //
        //    for (var i = 0; i < yesGroup.children.length; i++) {
        //        for (var j = 0; j < noGroup.children.length; j++) {
        //            showIntersections(noGroup.children[j], yesGroup.children[i])
        //        }
        //    }
        //};

//    var i = 0;

        //view.onFrame = function(event) {

        //for (var i = 0; i < yesGroup.children.length; i++) {
        //  for (var j = 0; j < noGroup.children.length; j++) {
        //      showIntersections(noGroup.children[j], yesGroup.children[i])
        //  }
        //}
        //  };

        var j = 0;

        view.onFrame = function(event) {

            for (var i = 0, l = boids.length; i < l; i++) {
                if (groupTogether) {
                    var length = ((i + event.count / 30) % l) / l * heartPath.length;
                    var point = heartPath.getPointAt(length);
                    if (point)
                        boids[i].arrive(point);
                }
                boids[i].run(boids);
            }

            //j++;
            //if (j != 8) {
            //    return;
            //} else {
            //    j = 0;
            //}
            //
            //for (var index = 0; index < ideas.children.length; ++index) {
            //    var x = ideas.children[index].position._x;
            //    var y = ideas.children[index].position._y;
            //
            //    if (x > 600) {
            //        x = -100;
            //    } else {
            //        x += Math.random() * index;
            //    }
            //
            //    if (y > 600) {
            //        y = -100;
            //    } else {
            //        y += Math.random() * index;
            //    }
            //    ideas.children[index].position = [x, y];
            //}
        };

        // Reposition the heart path whenever the window is resized:
        view.onResize = function(event) {
            heartPath.fitBounds(view.bounds);
            heartPath.scale(0.5);
        };

        tool.onMouseDown = function(event) {
            groupTogether = !groupTogether;
        };

        tool.onKeyDown = function(event) {
            if (event.key == 'space') {
                var layer = project.activeLayer;
                layer.selected = !layer.selected;
                return false;
            }
        };

        function showIntersections (path1, path2) {
            var intersections = path1.getIntersections(path2);
            for (var i = 0; i < intersections.length; i++) {
                new Path.Circle({
                    center: intersections[i].point,
                    radius: 5,
                    fillColor: '#009dec'
                }).removeOnMove();
            }
        }
    };

};

Template.paperjsScreen.helpers({
    editing: function() {
        return Session.get(EDITING_KEY);
    },

    todosReady: function() {
        return Router.current().todosHandle.ready();
    },

    todos: function(listId) {
        listIdA = listId;

        return Todos.find({listId: listId}, {sort: {createdAt : -1}}).map(function(todo, index) {
            todo.index = index;

            return todo;
        });
    }
});

var editList = function(list, template) {
    Session.set(EDITING_KEY, true);

    // force the template to redraw based on the reactive change
    Tracker.flush();
    template.$('.js-edit-form input[type=text]').focus();
};

var saveList = function(list, template) {
    Session.set(EDITING_KEY, false);
    Lists.update(list._id, {$set: {name: template.$('[name=name]').val()}});
};

Template.paperjsScreen.events({
    'click .js-cancel': function() {
        Session.set(EDITING_KEY, false);
    },

    'keydown input[type=text]': function(event) {
        // ESC
        if (27 === event.which) {
            event.preventDefault();
            $(event.target).blur();
        }
    },

    'blur input[type=text]': function(event, template) {
        // if we are still editing (we haven't just clicked the cancel button)
        if (Session.get(EDITING_KEY))
            saveList(this, template);
    },

    'submit .js-edit-form': function(event, template) {
        event.preventDefault();
        saveList(this, template);
    },

    // handle mousedown otherwise the blur handler above will swallow the click
    // on iOS, we still require the click event so handle both
    'mousedown .js-cancel, click .js-cancel': function(event) {
        event.preventDefault();
        Session.set(EDITING_KEY, false);
    },

    'change .list-edit': function(event, template) {
        if ($(event.target).val() === 'edit') {
            editList(this, template);
        } else if ($(event.target).val() === 'delete') {
            deleteList(this, template);
        } else {
            toggleListPrivacy(this, template);
        }

        event.target.selectedIndex = 0;
    },

    'click .js-edit-list': function(event, template) {
        editList(this, template);
    },

    'click .js-toggle-list-privacy': function(event, template) {
        toggleListPrivacy(this, template);
    },

    'click .js-delete-list': function(event, template) {
        deleteList(this, template);
    },

    'click .js-todo-add': function(event, template) {
        template.$('.js-todo-new input').focus();
    },

    'submit .js-todo-new': function(event) {
        event.preventDefault();

        var $input = $(event.target).find('[type=text]');
        if (! $input.val())
            return;

        Todos.insert({
            listId: this._id,
            text: $input.val(),
            checked: false,
            createdAt: new Date()
        });
        Lists.update(this._id, {$inc: {incompleteCount: 1}});
        $input.val('');
    }
});

