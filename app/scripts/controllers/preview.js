'use strict';

PhonicsApp.controller('PreviewCtrl', function PreviewCtrl(Storage, Builder,
  ASTManager, Sorter, Editor, BackendHealthCheck, FocusedPath,
  $scope, $rootScope) {
  function update(latest) {

    ASTManager.refresh(latest);

    // If backend is not healthy don't update
    if (!BackendHealthCheck.isHealthy() && !$rootScope.isPreviewMode) {
      return;
    }

    // Error can come in success callback, because of recursive promises
    // So we install same handler for error and success
    Builder.buildDocs(latest).then(onResult, onResult);
  }

  function onResult(result) {
    $scope.specs =  Sorter.sort(result.specs);
    $scope.error = null;
    Storage.save('progress',  1); // Saved

    if (!$rootScope.isPreviewMode) {
      Editor.clearAnnotation();
    }

    if (result.error) {
      if (result.error.yamlError && !$rootScope.isPreviewMode) {
        Editor.annotateYAMLErrors(result.error.yamlError);
      }
      $scope.error = result.error;
      Storage.save('progress', -1); // Error
    }
  }

  Storage.addChangeListener('yaml', update);

  // If app is in preview mode, load the yaml from storage
  if ($rootScope.isPreviewMode) {
    Storage.load('yaml').then(update);
  }

  ASTManager.onFoldStatusChanged(function () {
    _.defer(function () { $scope.$apply(); });
  });
  $scope.isCollapsed = ASTManager.isFolded;
  $scope.isAllFolded = ASTManager.isAllFolded;
  $scope.toggle = function (path) {
    ASTManager.toggleFold(path, Editor);
  };
  $scope.toggleAll = function (path) {
    ASTManager.setFoldAll(path, true, Editor);
  };

  /*
   * Focuses editor to a line that represents that path beginning
   * @param {AngularEvent} $event - angular event
   * @param {array} path - an array of keys into specs structure
   * @param {int} offset - Because of some bugs in AST generated by
   *   yaml-js, sometime generated line number is not accurate. this
   *   is used to adjust that. FIXME: it should get removed once bugs
   *   in yaml-js is fixed.
   * that points out that specific node
  */
  $scope.focusEdit = function ($event, path, offset) {

    // No focus in preview mode!
    if ($rootScope.isPreviewMode) {
      return;
    }
    var line = ASTManager.lineForPath(path);
    offset = offset || 0;
    $event.stopPropagation();
    Editor.gotoLine(line - offset);
  };

  /*
   * Returns true if operation is the operation in focus
   * in the editor
   * @returns {boolean}
  */
  $scope.isInFocus = function (path) {
    return !!path; //FocusedPath.isInFocus(path);
  };

  /*
  ** get a subpath for edit
  */
  $scope.getEditPath = function (pathName) {
    return '#/paths?path=' + window.encodeURIComponent(pathName);
  };

  /*
  ** Response CSS class for an HTTP response code
  */
  $scope.responseCodeClassFor = function (code) {
    var result = 'default';
    switch (Math.floor(+code / 100)) {
      case 2:
        result = 'green';
        break;
      case 5:
        result = 'red';
        break;
      case 4:
        result = 'yellow';
        break;
      case 3:
        result = 'blue';
    }
    return result;
  };

  /*
  ** Determines if a key is a vendor extension key
  ** Vendor extensions always start with `x-`
  */
  $scope.isVendorExtension = function (key) {
    return key.substring(0, 2).toLowerCase() === 'x-';
  };
});