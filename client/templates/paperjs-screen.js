var EDITING_KEY = 'editingList';
Session.setDefault(EDITING_KEY, false);
// Track if this is the first time the list template is rendered
var firstRender = true;
var listRenderHold = LaunchScreen.hold();
listFadeInHold = null;
var listIdA;

Template.paperjsScreen.rendered = function () {
    paper.install(window);
    paper.setup('canvas');

    if (firstRender) {
        // Released in app-body.js
        listFadeInHold = LaunchScreen.hold();

        // Handle for launch screen defined in app-body.js
        listRenderHold.release();
        firstRender = false;
    }

    console.log(maiika);

    maiika.Main = (function() {

        console.log("ooooooooooooooooo");

        paper.install(window);
        paper.setup('canvas');

        var heartPath = new paper.Path('M514.69629,624.70313c-7.10205,-27.02441 -17.2373,-52.39453 -30.40576,-76.10059c-13.17383,-23.70703 -38.65137,-60.52246 -76.44434,-110.45801c-27.71631,-36.64355 -44.78174,-59.89355 -51.19189,-69.74414c-10.5376,-16.02979 -18.15527,-30.74951 -22.84717,-44.14893c-4.69727,-13.39893 -7.04297,-26.97021 -7.04297,-40.71289c0,-25.42432 8.47119,-46.72559 25.42383,-63.90381c16.94775,-17.17871 37.90527,-25.76758 62.87354,-25.76758c25.19287,0 47.06885,8.93262 65.62158,26.79834c13.96826,13.28662 25.30615,33.10059 34.01318,59.4375c7.55859,-25.88037 18.20898,-45.57666 31.95215,-59.09424c19.00879,-18.32178 40.99707,-27.48535 65.96484,-27.48535c24.7373,0 45.69531,8.53564 62.87305,25.5957c17.17871,17.06592 25.76855,37.39551 25.76855,60.98389c0,20.61377 -5.04102,42.08691 -15.11719,64.41895c-10.08203,22.33203 -29.54687,51.59521 -58.40723,87.78271c-37.56738,47.41211 -64.93457,86.35352 -82.11328,116.8125c-13.51758,24.0498 -23.82422,49.24902 -30.9209,75.58594z');
        var boids = [];
        var tool = new paper.Tool();
        var timer = new Date();
        var addJellyTimer = 0;
        var jellyCounter = 0;
        var numJellies = 0;
        var jellyResolution = 14;
        var list = [];

        Todos.find({listId: listIdA}, {sort: {createdAt: -1}}).map(function (todo, index) {
            todo.index = index;
            var position = new paper.Point(paper.Point.random().x * paper.view.size._width, paper.Point.random().x * paper.view.size._height);
            boids.push(new maiika.Boid(position, 2, 0.05, todo.text));
            numJellies++;
            list.push(todo);
        });

        var jellies = [numJellies];

        this.drawJellies = function (event) {

            if (event.time > addJellyTimer + 6 && jellyCounter < numJellies) {
                jellySize = Math.random() * 10 + 40;
                var idea = list[jellyCounter];
                console.log(idea);
                jellies[jellyCounter] = new maiika.Jelly(jellyCounter, jellySize, jellyResolution, idea);
                jellies[jellyCounter].init();
                jellyCounter++;
                addJellyTimer = event.time;
            }

            if (jellyCounter > 0) {
                for (var j = 0; j < jellyCounter; j++) {
                    jellies[j].update(event);
                }
            }
        };

        this.drawTadpoles = function (event) {

            for (var i = 0, l = boids.length; i < l; i++) {
                if (groupTogether) {
                    var length = ((i + event.count / 30) % l) / l * heartPath.length;
                    var point = heartPath.getPointAt(length);
                    if (point)
                        boids[i].arrive(point);
                }
                boids[i].run(boids);
            }
        };

        view.onFrame = this.drawJellies;
        //view.onFrame = this.drawTadpoles;

        // Reposition the heart path whenever the window is resized:
        view.onResize = function (event) {
            heartPath.fitBounds(view.bounds);
            heartPath.scale(1);
        };

        tool.onMouseDown = function (event){
            groupTogether = !groupTogether;
        };

        tool.onKeyDown = function (event) {
            if (event.key == 'space') {
                var layer = project.activeLayer;
                layer.selected = !layer.selected;
                return false;
            }
        };
    })();
};

Template.paperjsScreen.helpers({
    editing: function () {
        return Session.get(EDITING_KEY);
    },

    todosReady: function () {
        return Router.current().todosHandle.ready();
    },

    todos: function (listId) {
        listIdA = listId;

        return Todos.find({listId: listId}, {sort: {createdAt: -1}}).map(function (todo, index) {
            todo.index = index;

            return todo;
        });
    }
});

var editList = function (list, template) {
    Session.set(EDITING_KEY, true);

    // force the template to redraw based on the reactive change
    Tracker.flush();
    template.$('.js-edit-form input[type=text]').focus();
};

var saveList = function (list, template) {
    Session.set(EDITING_KEY, false);
    Lists.update(list._id, {$set: {name: template.$('[name=name]').val()}});
};

Template.paperjsScreen.events({
    'click .js-cancel': function () {
        Session.set(EDITING_KEY, false);
    },

    'keydown input[type=text]': function (event) {
        // ESC
        if (27 === event.which) {
            event.preventDefault();
            $(event.target).blur();
        }
    },

    'blur input[type=text]': function (event, template) {
        // if we are still editing (we haven't just clicked the cancel button)
        if (Session.get(EDITING_KEY))
            saveList(this, template);
    },

    'submit .js-edit-form': function (event, template) {
        event.preventDefault();
        saveList(this, template);
    },

    // handle mousedown otherwise the blur handler above will swallow the click
    // on iOS, we still require the click event so handle both
    'mousedown .js-cancel, click .js-cancel': function (event) {
        event.preventDefault();
        Session.set(EDITING_KEY, false);
    },

    'change .list-edit': function (event, template) {
        if ($(event.target).val() === 'edit') {
            editList(this, template);
        } else if ($(event.target).val() === 'delete') {
            deleteList(this, template);
        } else {
            toggleListPrivacy(this, template);
        }

        event.target.selectedIndex = 0;
    },

    'click .js-edit-list': function (event, template) {
        editList(this, template);
    },

    'click .js-toggle-list-privacy': function (event, template) {
        toggleListPrivacy(this, template);
    },

    'click .js-delete-list': function (event, template) {
        deleteList(this, template);
    },

    'click .js-todo-add': function (event, template) {
        template.$('.js-todo-new input').focus();
    },

    'submit .js-todo-new': function (event) {
        event.preventDefault();

        var $input = $(event.target).find('[type=text]');
        if (!$input.val())
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

