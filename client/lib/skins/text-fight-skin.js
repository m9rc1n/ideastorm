maiika = {};
groupTogether = false;

Template.paperjsScreen.created = function () {

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

    maiika.Boid.prototype.run = function (boids) {
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
    };

    maiika.Boid.prototype.calculateTail = function () {

        var segments = this.path.segments,
            shortSegments = this.shortPath.segments;
        var speed = this.vector.length;
        var pieceLength = 5 + speed / 3;
        var point = this.position.clone();
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

        this.head = new paper.Shape.Ellipse({
            center: [0, 0],
            size: [13, 8],
            fillColor: 'black'
        });

        this.path = new paper.Path({
            strokeColor: 'black',
            strokeWidth: 2,
            strokeCap: 'round'
        });
        for (var i = 0; i < this.amount; i++)
            this.path.add(new paper.Point());

        this.shortPath = new paper.Path({
            strokeColor: 'black',
            strokeWidth: 4,
            strokeCap: 'round'
        });

        this.text = new paper.PointText(new paper.Point());
        this.text.fillColor = 'black';
        this.text.content = this.idea;
        this.text.fontSize = "12px";

        for (var i = 0; i < Math.min(3, this.amount); i++)
            this.shortPath.add(new paper.Point());
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

    maiika.Boid.prototype.update = function () {
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
};