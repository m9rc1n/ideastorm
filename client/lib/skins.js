maiika = {};
groupTogether = false;
//mediaElement;
playing = false;

maiika.Jelly = function (id, radius, resolution, ideaData) {
    this.path = new paper.Path();
    this.pathRadius = radius;
    this.pathSides = resolution;
    this.pathPoints = [this.pathSides];
    this.pathPointsNormals = [this.pathSides];
    this.group = new paper.Group();
    this.ideaData = ideaData;

    // Colours courtesy of deliquescence:
    // http://www.colourlovers.com/palette/38473/boy_meets_girl
    this.colours = [{s: "#1C4347", f: "#49ACBB"},
        {s: "#1b3b3a", f: "#61cac8"},
        {s: "#2d393f", f: "#88a5b3"},
        {s: "#422b3a", f: "#b0809e"},
        {s: "#5b263a", f: "#d85c8a"},
        {s: "#580c23", f: "#ff3775"},
        {s: "#2d393f", f: "#88a5b3"},
        {s: "#422b3a", f: "#b0809e"},
        {s: "#5b263a", f: "#d85c8a"},
        {s: "#580c23", f: "#ff3775"},
        {s: "#2d393f", f: "#88a5b3"},
        {s: "#422b3a", f: "#b0809e"},
        {s: "#5b263a", f: "#d85c8a"},
        {s: "#580c23", f: "#ff3775"},
        {s: "#2d393f", f: "#88a5b3"},
        {s: "#422b3a", f: "#b0809e"},
        {s: "#5b263a", f: "#d85c8a"},
        {s: "#580c23", f: "#ff3775"},
        {s: "#681635", f: "#EB1962"}];

    this.pathStyle = {
        strokeWidth: 5,
        strokeColor: this.colours[id].s,
        fillColor: this.colours[id].f
    };

    this.location = new paper.Point(-50, Math.random() * paper.view.size.height);
    this.velocity = new paper.Point(0, 0);
    this.acceleration = new paper.Point(0, 0);

    this.maxSpeed = Math.random() * 0.1 + 0.15;
    this.maxTravelSpeed = this.maxSpeed * 3.5;
    this.maxForce = 0.2;
    this.wanderTheta = 0;
    this.orientation = 0;
    this.lastOrientation = 0;
    this.numTentacles = 0;

    this.text = new paper.PointText(this.location);
    this.text.justification = 'center';
    this.text.fillColor = 'white';
    this.text.content = ideaData.text;

    console.log(this.text);
    // console.log(this.maxSpeed);
    // console.log(this.pathRadius);
    // console.log("---------------------------------------");
};


maiika.Jelly.prototype.init = function () {
    for (var i = 0; i < this.pathSides; i++) {
        var theta = (Math.PI * 2) / this.pathSides;
        var angle = theta * i;
        var x = Math.cos(angle) * this.pathRadius * 0.7;
        var y = Math.sin(angle) * this.pathRadius;

        if (angle > 0 && angle < Math.PI) {
            y -= Math.sin(angle) * (this.pathRadius * 0.6);
            this.numTentacles++;
        }

        var point = new paper.Point(x, y);

        this.path.add(point);
        this.pathPoints[i] = point.clone();
        this.pathPointsNormals[i] = point.normalize().clone();
    }

    this.path.closed = true;
    this.path.smooth();
    this.path.style = this.pathStyle;
    this.group.addChild(this.path);

    // Create tentacles
    this.tentacles = [this.numTentacles];
    for (var t = 0; t < this.numTentacles; t++) {
        this.tentacles[t] = new maiika.Tentacle(7, 4);
        this.tentacles[t].init();
        this.tentacles[t].path.strokeColor = this.path.strokeColor;
        this.tentacles[t].path.strokeWidth = this.path.strokeWidth;
    }
};

maiika.Jelly.prototype.update = function (event) {
    this.lastLocation = this.location.clone();
    this.lastOrientation = this.orientation;

    this.velocity.x += this.acceleration.x;
    this.velocity.y += this.acceleration.y;
    this.velocity.length = Math.min(this.maxTravelSpeed, this.velocity.length);

    this.location.x += this.velocity.x;
    this.location.y += this.velocity.y;

    this.text.position = this.location;

    this.acceleration.length = 0;

    // this.path.position = this.location.clone();
    this.group.position = this.location.clone();

    // Rotation alignment
    var locVector = new paper.Point(this.location.x - this.lastLocation.x,
        this.location.y - this.lastLocation.y);
    this.orientation = locVector.angle + 90;
    // this.path.rotate(this.orientation - this.lastOrientation);
    this.group.rotate(this.orientation - this.lastOrientation);

    // Expansion Contraction
    for (var i = 0; i < this.pathSides; i++) {
        var segmentPoint = this.path.segments[i].point;
        // var sineSeed = -(event.time * 3 + this.path.segments[i].point.y * 0.5);
        var sineSeed = -((event.count * this.maxSpeed) + (this.pathPoints[i].y * 0.0375));
        var normalRotatedPoint = this.pathPointsNormals[i].rotate(this.orientation);

        segmentPoint.x += normalRotatedPoint.x * Math.sin(sineSeed);
        segmentPoint.y += normalRotatedPoint.y * Math.sin(sineSeed);
    }

    for (var t = 0; t < this.numTentacles; t++) {
        this.tentacles[t].anchor.point = this.path.segments[t + 1].point;
        this.tentacles[t].update(this.orientation);
    }

    this.path.smooth();
    this.wander();
    this.checkBounds();
};


maiika.Jelly.prototype.steer = function (target, slowdown) {
    var steer;
    var desired = new paper.Point(target.x - this.location.x, target.y - this.location.y);
    var dist = desired.length;

    if (dist > 0) {
        if (slowdown && dist < 100) {
            desired.length = (this.maxTravelSpeed) * (dist / 100);
        }
        else {
            desired.length = this.maxTravelSpeed;
        }

        steer = new paper.Point(desired.x - this.velocity.x, desired.y - this.velocity.y);
        steer.length = Math.min(this.maxForce, steer.length);
    }
    else {
        steer = new paper.Point(0, 0);
    }
    return steer;
};

maiika.Jelly.prototype.seek = function (target) {
    var steer = this.steer(target, false);
    this.acceleration.x += steer.x;
    this.acceleration.y += steer.y;
};

maiika.Jelly.prototype.wander = function () {
    var wanderR = 5;
    var wanderD = 100;
    var change = 0.05;

    this.wanderTheta += Math.random() * (change * 2) - change;

    var circleLocation = this.velocity.clone();
    circleLocation = circleLocation.normalize();
    circleLocation.x *= wanderD;
    circleLocation.y *= wanderD;
    circleLocation.x += this.location.x;
    circleLocation.y += this.location.y;

    var circleOffset = new paper.Point(wanderR * Math.cos(this.wanderTheta), wanderR * Math.sin(this.wanderTheta));

    var target = new paper.Point(circleLocation.x + circleOffset.x, circleLocation.y + circleOffset.y);

    this.seek(target);
};


maiika.Jelly.prototype.checkBounds = function () {
    var offset = 60;
    if (this.location.x < -offset) {
        this.location.x = paper.view.size.width + offset;
        for (var t = 0; t < this.numTentacles; t++) {
            this.tentacles[t].path.position = this.location.clone();
        }
    }
    if (this.location.x > paper.view.size.width + offset) {
        this.location.x = -offset;
        for (t = 0; t < this.numTentacles; t++) {
            this.tentacles[t].path.position = this.location.clone();
        }
    }
    if (this.location.y < -offset) {
        this.location.y = paper.view.size.height + offset;
        for (t = 0; t < this.numTentacles; t++) {
            this.tentacles[t].path.position = this.location.clone();
        }
    }
    if (this.location.y > paper.view.size.height + offset) {
        this.location.y = -offset;
        for (t = 0; t < this.numTentacles; t++) {
            this.tentacles[t].path.position = this.location.clone();
        }
    }
};


maiika.Tentacle = function (segments, length) {
    this.anchor = new paper.Segment();
    this.path = new paper.Path();
    this.numSegments = segments;
    this.segmentLength = Math.random() + length - 1;
};


maiika.Tentacle.prototype.init = function () {
    for (var i = 0; i < this.numSegments; i++) {
        this.path.add(new paper.Point(0, i * this.segmentLength));
    }

    this.path.strokeCap = 'round';

    this.anchor = this.path.segments[0];
};


maiika.Tentacle.prototype.update = function (orientation) {
    this.path.segments[1].point = this.anchor.point;

    var dx = this.anchor.point.x - this.path.segments[1].point.x;
    var dy = this.anchor.point.y - this.path.segments[1].point.y;
    var angle = Math.atan2(dy, dx) + ((orientation + 90) * (Math.PI / 180));

    this.path.segments[1].point.x += Math.cos(angle);
    this.path.segments[1].point.y += Math.sin(angle);

    for (var i = 2; i < this.numSegments; i++) {
        var px = this.path.segments[i].point.x - this.path.segments[i - 2].point.x;
        var py = this.path.segments[i].point.y - this.path.segments[i - 2].point.y;
        var pt = new paper.Point(px, py);
        var len = pt.length;

        if (len > 0.0) {
            this.path.segments[i].point.x = this.path.segments[i - 1].point.x + (pt.x * this.segmentLength) / len;
            this.path.segments[i].point.y = this.path.segments[i - 1].point.y + (pt.y * this.segmentLength) / len;
        }
    }
};

maiika.Boid = function (position, maxSpeed, maxForce, idea) {
    var strength = Math.random() * 0.5;
    this.acceleration = new paper.Point();
    this.idea = idea;
    this.vector = paper.Point.random();
    this.vector.x *= 2;
    this.vector.x -= 1;
    this.vector.y *= 2;
    this.vector.y -= 1;
    this.position = position.clone();
    this.radius = 30;
    this.maxSpeed = maxSpeed + strength;
    this.maxForce = maxForce + strength;
    this.amount = strength * 10 + 10;
    this.count = 0;
    this.createItems();
};

maiika.Boid.prototype.update = function (boids) {
    this.lastLoc = this.position.clone();
    if (!groupTogether) {
        this.flock(boids);
    } else {
        this.align(boids);
    }
    this.borders();
    this.updateParameters();
    this.calculateTail();
    this.moveHead();
};

maiika.Boid.prototype.calculateTail = function () {

    var segments = this.path.segments,
        shortSegments = this.shortPath.segments;
    var speed = this.vector.length;
    var pieceLength = 5 + speed / 3;
    var point = this.position.clone();

    point.x += this.head.size._width;
    point.y += this.head.size._height;
    segments[0].point = shortSegments[0].point = point;
    // Chain goes the other way than the movement
    var lastVector = this.vector.clone();
    lastVector.x *= -1;
    lastVector.y *= -1;
    for (var i = 1; i < this.amount; i++) {
        var vector = segments[i].point.clone();
        vector.x -= point.x;
        vector.y -= point.y;
        this.count += speed * 10;
        var wave = Math.sin((this.count + i * 3) / 300);
        var sway = lastVector.rotate(90).normalize(wave);
        var normalizedSway = lastVector.normalize(pieceLength).clone();
        point.x += normalizedSway.x + sway.x;
        point.y += normalizedSway.y + sway.y;
        segments[i].point = point.clone();
        if (i < 3)
            shortSegments[i].point = point;
        lastVector = vector.clone();
    }
    this.path.smooth();
};

maiika.Boid.prototype.createItems = function () {

    this.text = new paper.PointText(new paper.Point());
    this.text.content = this.idea;

    this.head = new paper.Shape.Ellipse({
        center: [0, 0],
        size: [this.text.handleBounds.width + 10, this.text.handleBounds.height + 10],
        fillColor: 'black'
    });

    this.text.remove();

    this.path = new paper.Path({
        strokeColor: '#FF69B4',
        strokeWidth: 2,
        strokeCap: 'round'
    });

    for (var i = 0; i < this.amount; i++) {
        this.path.add(new paper.Point());
    }

    this.shortPath = new paper.Path({
        strokeColor: '#FF69B4',
        strokeWidth: 4,
        strokeCap: 'round'
    });

    for (i = 0; i < Math.min(3, this.amount); i++) {
        this.shortPath.add(new paper.Point());
    }

    this.text = new paper.PointText(new paper.Point());
    this.text.content = this.idea;
    //this.text.fontSize = "16px";
    this.text.fillColor = 'white';
};

maiika.Boid.prototype.moveHead = function () {
    this.head.position = this.position.clone();
    this.text.position = this.position.clone();
    this.head.rotation = this.vector.angle;
    this.text.rotation = this.vector.angle;
};

// We accumulate a new acceleration each time based on three rules
maiika.Boid.prototype.flock = function (boids) {
    var separation = this.separate(boids).clone();
    separation.x *= 3;
    separation.y *= 3;
    var alignment = this.align(boids).clone();
    var cohesion = this.cohesion(boids).clone();
    //this.acceleration = Point.addPoints(Point.addPoints(this.acceleration, separation), Point.addPoints(alignment, cohesion));
    this.acceleration.x += separation.x;
    this.acceleration.x += alignment.x;
    this.acceleration.x += cohesion.x;
    this.acceleration.y += separation.y;
    this.acceleration.y += alignment.y;
    this.acceleration.y += cohesion.y;
};

maiika.Boid.prototype.updateParameters = function () {
    // Update velocity
    this.vector.x += this.acceleration.x;
    this.vector.y += this.acceleration.y;
    // Limit speed (vector#limit?)
    this.vector.length = Math.min(this.maxSpeed, this.vector.length);
    this.position.x += this.vector.x;
    this.position.y += this.vector.y;
    // Reset acceleration to 0 each cycle
    this.acceleration = new paper.Point();
};

maiika.Boid.prototype.seek = function (target) {
    this.acceleration.x += this.steer(target, false).x;
    this.acceleration.y += this.steer(target, false).y;
};

maiika.Boid.prototype.arrive = function (target) {
    this.acceleration.x += this.steer(target, true).x;
    this.acceleration.y += this.steer(target, true).y;
};

maiika.Boid.prototype.borders = function () {
    var vector = new paper.Point();
    var position = this.position;
    var radius = this.radius;
    var size = paper.view.size;
    if (position.x < -radius) vector.x = size.width + radius;
    if (position.y < -radius) vector.y = size.height + radius;
    if (position.x > size.width + radius) vector.x = -size.width - radius;
    if (position.y > size.height + radius) vector.y = -size.height - radius;
    if (!vector.isZero()) {
        this.position.x += vector.x;
        this.position.y += vector.y;
        var segments = this.path.segments;
        for (var i = 0; i < this.amount; i++) {
            segments[i].point.x += vector.x;
            segments[i].point.y += vector.y;
        }
    }
};

// A method that calculates a steering vector towards a target
// Takes a second argument, if true, it slows down as it approaches
// the target
maiika.Boid.prototype.steer = function (target, slowdown) {
    var desired = new paper.Point();
    var steer = new paper.Point();
    steer.x = desired.x = target.x - this.position.x;
    steer.y = desired.x = target.y - this.position.y;
    var distance = desired.length;
    // Two options for desired vector magnitude
    // (1 -- based on distance, 2 -- maxSpeed)
    if (slowdown && distance < 100) {
        // This damping is somewhat arbitrary:
        desired.length = this.maxSpeed * (distance / 100);
    } else {
        desired.length = this.maxSpeed;
    }
    steer.x = desired.x - this.vector.x;
    steer.y = desired.y - this.vector.y;
    steer.length = Math.min(this.maxForce, steer.length);
    return steer;
};

maiika.Boid.prototype.separate = function (boids) {
    var desiredSeperation = 60;
    var steer = new paper.Point();
    var count = 0;
    // For every boid in the system, check if it's too close
    for (var i = 0, l = boids.length; i < l; i++) {
        var other = boids[i];
        var vector = new paper.Point();
        vector.x = this.position.x - other.position.x;
        vector.y = this.position.y - other.position.y;
        var distance = vector.length;
        if (distance > 0 && distance < desiredSeperation) {
            // Calculate vector pointing away from neighbor
            steer.x += vector.normalize(1 / distance).x;
            steer.y += vector.normalize(1 / distance).y;
            count++;
        }
    }
    // Average -- divide by how many
    if (count > 0) {
        steer.x /= count;
        steer.y /= count;
    }
    if (!steer.isZero()) {
        // Implement Reynolds: Steering = Desired - Velocity
        steer.length = this.maxSpeed;
        steer.x -= this.vector.x;
        steer.y -= this.vector.y;
        steer.length = Math.min(steer.length, this.maxForce);
    }
    return steer;
};

// Alignment
// For every nearby boid in the system, calculate the average velocity
maiika.Boid.prototype.align = function (boids) {
    var neighborDist = 25;
    var steer = new paper.Point();
    var count = 0;
    for (var i = 0, l = boids.length; i < l; i++) {
        var other = boids[i];
        var distance = this.position.getDistance(other.position);
        if (distance > 0 && distance < neighborDist) {
            steer.x += other.vector.x;
            steer.y += other.vector.y;
            count++;
        }
    }

    if (count > 0) {
        steer.x /= count;
        steer.y /= count;
    }

    if (!steer.isZero()) {
        // Implement Reynolds: Steering = Desired - Velocity
        steer.length = this.maxSpeed;
        steer.x -= this.vector.x;
        steer.y -= this.vector.y;
        steer.length = Math.min(steer.length, this.maxForce);
    }
    return steer;
};

// Cohesion
// For the average location (i.e. center) of all nearby boids,
// calculate steering vector towards that location
maiika.Boid.prototype.cohesion = function (boids) {
    var neighborDist = 100;
    var sum = new paper.Point();
    var count = 0;
    for (var i = 0, l = boids.length; i < l; i++) {
        var other = boids[i];
        var distance = this.position.getDistance(other.position);
        if (distance > 0 && distance < neighborDist) {
            sum.x += other.position.x; // Add location
            sum.y += other.position.y; // Add location
            count++;
        }
    }
    if (count > 0) {
        sum.x /= count;
        sum.y /= count;
        // Steer towards the location
        return this.steer(sum, false);
    }
    return sum;
};


maiika.Stars = function() {
    // The amount of symbol we want to place;
    this.count = 50;
    // Create a symbol, which we will use to place instances of later:
    this.path = new paper.Path.Circle({
        center: new paper.Point(0, 0),
        radius: 5,
        fillColor: 'white',
        strokeColor: 'black'
    });
    this.symbol = new paper.Symbol(this.path);
    this.init();
};

maiika.Stars.prototype.init = function() {

    // Place the instances of the symbol:
    for (var i = 0; i < this.count; i++) {
        // The center position is a random point in the view:
        var center = paper.Point.random();
        center.x *= paper.view.size._width;
        center.y *= paper.view.size._height;

        var placed = this.symbol.place(center);
        placed.scale(i / this.count + 0.01);
        placed.data = {
            vector: new paper.Point({
                angle: Math.random() * 360,
                length : (i / this.count) * Math.random() / 5
            })

        };
    }
};

maiika.Stars.prototype.keepInView = function(item) {
    var position = item.position.clone();

    var viewBounds = paper.view.bounds;
    var itemBounds = item.bounds;

    if (position.isInside(viewBounds)) {
        return;
    }

    if (position.x > viewBounds.width + 5) {
        position.x = -item.bounds.width;
    }

    if (position.x < -itemBounds.width - 5) {
        position.x = viewBounds.width;
    }

    if (position.y > viewBounds.height + 5) {
        position.y = -itemBounds.height;
    }

    if (position.y < -itemBounds.height - 5) {
        position.y = viewBounds.height
    }
};

maiika.Stars.prototype.update = function(vector) {
    // Run through the active layer's children list and change
    // the position of the placed symbols:
    for (var i = 0; i < this.count; i++) {
        var item = this.symbol._boundsCache.list[i];
        var size = item.bounds.size;
        var length = vector.length / 10 * size.width / 10;

        item.position.x += vector.normalize(length).x + item.data.vector.x;
        item.position.y += vector.normalize(length).y + item.data.vector.y;

        this.keepInView(item);
    }
};

maiika.Rainbow = function() {
    this.paths = [];
    this.colors = ['red', 'orange', 'yellow', 'lime', 'blue', 'purple'];
    for (var i = 0; i < this.colors.length; i++) {
        var path = new paper.Path({
            fillColor: this.colors[i]
        });
        this.paths.push(path);
    }

    this.circle = new paper.Path.Circle();
    this.eye = new paper.Path.Circle();
    this.innerCircle = new paper.Path.Circle();
    this.headGroup = new paper.Group(this.circle, this.innerCircle, this.eye);
    this.count = 30;
    this.group = new paper.Group(this.paths);
    this.eyePosition = new paper.Point();
    this.eyeFollow = paper.Point.random();
    this.eyeFollow.x -= 0.5;
    this.eyeFollow.y -= 0.5;
    this.blinkTime = 200;
};

maiika.Rainbow.prototype.update = function(event, position) {
    var vector = paper.view.center.clone();
    vector.x -= position.x;
    vector.x /= 10;
    vector.y -= position.y;
    vector.y /= 10;

    if (vector.length < 5) {
        vector.length = 5;
    }
    this.count += vector.length / 100;
    this.group.translate(vector);
    var rotated = vector.rotate(90);
    var middle = this.paths.length / 2;
    for (var j = 0; j < this.paths.length; j++) {
        var path = this.paths[j];
        var nyanSwing = playing ? Math.sin(event.count / 2) * vector.length : 1;
        var unitLength = vector.length * (2 + Math.sin(event.count / 10)) / 2;
        var length = (j - middle) * unitLength + nyanSwing;
        var top = paper.view.center.clone();
        top.x += rotated.normalize(length).x;
        top.y += rotated.normalize(length).y;
        var bottom = paper.view.center.clone();
        bottom.x += rotated.normalize(length + unitLength).x;
        bottom.y += rotated.normalize(length + unitLength).y;
        path.add(top);
        path.insert(0, bottom);
        if (path.segments.length > 200) {
            var index = Math.round(path.segments.length / 2);
            path.segments[index].remove();
            path.segments[index - 1].remove();
        }
        path.smooth();
    }
    this.createHead(vector, event.count);
    //if (mediaElement) {
    //    mediaElement.setVolume(vector.length / 200);
    //}
};

maiika.Rainbow.prototype.createHead = function (vector, count) {
    var eyeVector = this.eyePosition;
    eyeVector.x -= this.eyeFollow.x;
    eyeVector.y -= this.eyeFollow.y;
    this.eyePosition.x -= eyeVector.x / 4;
    this.eyePosition.y -= eyeVector.y / 4;
    if (eyeVector.length < 0.00001) {
        this.eyeFollow = paper.Point.random();
        this.eyeFollow.x -= 0.5;
        this.eyeFollow.y -= 0.5;
    }
    if (this.headGroup) {
        this.headGroup.remove();
    }

    var top = this.paths[0].getLastSegment().point;
    var bottom = this.paths[this.paths.length - 1].getFirstSegment().point;
    var radius = (bottom - top).length / 2;
    this.circle = new paper.Path.Circle({
        center: top + (bottom - top) / 2,
        radius: radius,
        fillColor: 'black'
    });
    this.circle.scale(vector.length / 100, 1);
    this.circle.rotate(vector.angle, this.circle.center);

    this.innerCircle = this.circle.clone();
    this.innerCircle.scale(0.5);
    this.innerCircle.fillColor = (count % this.blinkTime < 3)
    || (count % (this.blinkTime + 5) < 3) ? 'black' : 'white';
    if (count % (this.blinkTime + 40) == 0) {
        this.blinkTime = Math.round(Math.random() * 40) + 200;
    }
    this.eye = this.circle.clone();
    this.eye.position.x += this.eyePosition.x * radius;
    this.eye.position.y += this.eyePosition.y * radius;
    this.eye.scale(0.15, this.innerCircle.position);
    this.eye.fillColor = 'black';

    this.headGroup = new paper.Group(this.circle, this.innerCircle, this.eye);
};