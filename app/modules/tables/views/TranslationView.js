define([
  'app',
  'backbone',
  'core/directus',
  "core/EntriesManager"
],

function(app, Backbone, Directus, EntriesManager) {

  return Backbone.Layout.extend({
    template: Handlebars.compile('<div class="section-header"><span class="big-label-text">Translations</span> \
      <select id="activeLanguageSelect" class="section-dropdown">{{#languages}}<option {{#if active}}selected{{/if}} value="{{val}}">{{name}}</option>{{/languages}}</select></div> \
      <div id="translateEditFormEntry"></div>'),
    events: {
      'change #activeLanguageSelect': function(e) {
        var that = this;
        var originalVal = $(e.target).val();
        $(e.target).val(this.activeLanguageId);
        app.router.openModal({type: 'yesnocancel', text: 'Do you wish to save changes to current Translation?', callback: function(response) {
          if(response === 'yes') {
            that.saveTranslation();
          }
          that.initializeTranslateView(originalVal);
        }});

      }
    },
    saveTranslation: function() {
      this.translateModel.set(this.translateModel.diff(this.editView.data()));
      if(!this.translateCollection.contains(this.translateModel)) {
        this.translateCollection.add(this.translateModel, {nest: true});
      }
    },
    afterRender: function() {
      if(this.editView) {
        this.insertView("#translateEditFormEntry", this.editView);
        this.editView.render();
      }
    },
    initialize: function(options) {
      this.translateId = options.translateId;
      this.translateSettings = options.translateSettings;
      this.translateRelationship = options.translateRelationship;

      if(this.model.id) {
        this.listenToOnce(this.model, 'sync', this.updateTranslateConnection);
      } else {
        this.updateTranslateConnection();
      }
    },

    updateTranslateConnection: function() {
      this.translateCollection = this.model.get(this.translateId);

      this.languageCollection = EntriesManager.getInstance(this.translateSettings.languages_table);
      this.listenTo(this.languageCollection, 'sync', function() {this.initializeTranslateView();});
      this.languageCollection.fetch();
    },

    initializeTranslateView: function(language) {
      if(language === undefined) {
        this.activeLanguageId = this.translateSettings.default_language_id;
      } else {
        this.activeLanguageId = language;
      }

      var that = this;
      this.translateModel = null;

      this.translateCollection.forEach(function(model) {
        if(model.get(that.translateSettings.left_column_name) == that.activeLanguageId) {
          that.translateModel = model;
        }
      });

      if(!this.translateModel) {
        this.translateModel = new this.translateCollection.model({}, {collection: this.translateCollection, parse: true});
        var data = {};
        data[this.translateSettings.left_column_name] = this.activeLanguageId;
        data[this.translateRelationship.junction_key_right] = this.model.id;
        this.translateModel.set(data);
      }

      this.editView = new Directus.EditView({
        model: this.translateModel,
        hiddenFields: [this.translateSettings.left_column_name, this.translateRelationship.junction_key_right],
      });

      this.render();
    },
    serialize: function() {
      var data = {};

      var that = this;

      if(this.languageCollection) {
        data.languages = this.languageCollection.map(function(item) {
          return {val: item.id, name: item.get(that.translateSettings.languages_name_column), active: (item.id == that.activeLanguageId)};
        });
      }

      return data;
    }
  });
});