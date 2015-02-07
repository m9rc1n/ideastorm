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
    maiika = maiika || {};

    maiika.Main = (function() {

        paper.install(window);
        paper.setup('canvas');

        var timer = new Date();
        var addJellyTimer = 0;
        var jellyCounter = 0;
        var numJellies = 0;
        var jellyResolution = 14;
        var list = [];

        Todos.find({listId: listIdA}, {sort: {createdAt : -1}}).map(function(todo, index) {
            todo.index = index;
            numJellies++;
            list.push(todo);
        });

        var jellies = [numJellies];

        this.draw = function(event) {

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

        view.onFrame = draw;

    })();
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

