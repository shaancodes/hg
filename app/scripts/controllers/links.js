'use strict';

/**
 * @ngdoc function
 * @name linkDumpApp.controller:LinksCtrl
 * @description
 * # LinksCtrl
 * Controller of the linkDumpApp
 */
angular.module('linkDumpApp')
  .controller('LinksCtrl', function($scope, $sce,
      $cookies, $timeout, Dumps, Dump, Labels, Label,
      $location, $http, Embedder, Gridify, Toasty) {

      //Our main scraper will be noembed, since it is free and open soruce
      //With embedly as a backup to keep costs low
      //our embedly key

    //Initialize Dumps
    $scope.dumps = [];

    //Initialize our embedder
    $scope.embedder = Embedder;

    //Initialize our grid
    $scope.gridify = Gridify;

    //Initialize how many dumps we are showing
    var displayRate = 10;
    var displayDefault = 25;
    $scope.displayLinks = displayDefault;

    //Get our sessions token
    var sessionToken = $cookies.get("sessionToken");

    //To get the correct things to fire the in viewport, wait a second and then scroll to the top
    $timeout(function() {
      if (window.scrollY == 0 && window.scrollX == 0) {
        window.scrollTo(0, 1);
      }
    }, 2000);

    //Inititalize searching
    $scope.findInput = false;

    //Show the find input
    var finding = false;
    var originalDisplayLimit = displayDefault;
    //Make findDelay in scope for ng model options
    $scope.findDelay = 500;
    //A simple function to return the filter length for the loading H1
    $scope.findFilterLength = function() {

        if(!$scope.enteredFind) return 0;

        //Else keep going and find the to lowercase value
        return $scope.dumps.filter(function(value) {
            return (value.content.indexOf($scope.enteredFind.toLowerCase()) > -1);
        }).length;
    }

    $scope.findRefresh = function() {

        //Refresh our grid
        //in a timeout to apply the DOM
        $timeout(function () {

            Gridify.refreshGrid();
        }, $scope.findDelay + 375);
    }

    $scope.toggleFind = function() {

        //Allow this function to only be called once per half second
        //To avoid weird glitching
        if(!finding) {

            finding = true;

            //Return our results to the find Filter

            if ($scope.findInput &&
            (!$scope.enteredFind ||
            $scope.enteredFind == "")) {

              $scope.findInput = false;

              //Also set our original display limit back
              $scope.displayLinks = originalDisplayLimit;
            }
            else if(!$scope.findInput) {

                  $scope.findInput = true;

                  //Also, set our display limit back to default
                  originalDisplayLimit = $scope.displayLinks;
                  $scope.displayLinks = displayDefault;

                  //To get the correct things to fire the in viewport, wait a second and then scroll to the top
                  $timeout(function() {
                    if (window.scrollY == 0 && window.scrollX == 0) {

                      //focus on the field
                      document.getElementById('findInput').focus();

                    }
                }, 150);
             }

             //Set finding back to false
            $timeout(function () {

                //Reset finding
                finding = false;

            }, $scope.findDelay);
        }
    }

    //get our dumps, on init
    $scope.getDumps = function() {
      //Our json we will submit to the backend
      var dumpJson = {
        "token": sessionToken,
      };

      Dumps.get(dumpJson,
        function(data, status) {

          //Save our dumps to scope
          $scope.dumps = data;

          //Re-order our dumps
          $timeout(function () {
              Gridify.refreshGrid();
          }, 10);
        },
        function(err) {
          if (err.status == 401) {
            //Session is invalid! Redirect.
            $location.path("/");
          } else {

            //Show a toast
            Toasty.show(err.data.msg);
          }
        }
      );
    }
    $scope.getDumps();

    //Get the title of a link
    $scope.getTitle = function(dump, index) {

      //Get the response from noembed
      $http.get("https://dev.kondeo.com/api/title-scraper.php?q=" + dump.content)
        .then(function(response) {

          //Get the document
          var element = document.getElementById("linkTitle-" + index);

          //Make sure the element isnt null and we got the object
          if(element != null)
          {
              element.innerHTML = response.data.title;
          }

        });
    }

    //Check if a link already exists
    function linkExists() {
      for (var i = 0; i < $scope.dumps.length; i++) {
        if ($scope.dumps[i].content == $scope.enteredLink) {

            //Show a toast
            Toasty.show("Link already exists!")

          //Set the input back to empty
          $scope.enteredLink = "";

          return true;
        }
      }

      return false;
    }

    //Submit a dumped link
    $scope.submitLink = function() {
      //First need to see if it is a valid url
      if ($scope.linkForm.linkInput.$valid) {
        //Need to set a slight timeout for ng paste
        $timeout(function() {
          //Also check if the link already exists
          if (!linkExists()) {
            //Our json we will submit to the backend
            var enterJson = {
              "token": sessionToken,
              "content": $scope.enteredLink
            };

            //Save the link
            Dumps.save(enterJson,
              function(data, status) {
                //Set enetered link back to null
                $scope.enteredLink = "";

                //Show a toast
                Toasty.show("Dropped!");

                //Add new dump to dump array
                $scope.dumps.unshift(data);

                //Refresh our grid
                Gridify.refreshGrid();

              },
              function(err) {

                 //Error a toast
                 Toasty.show(err.data.msg);
              });
          }
        }, 1);
      }
      //it is not a valid url
      else {
        //Toast here the error
      }
    }

    //Remove a dumped link
    $scope.removeLink = function(dump) {
      //Our json we will submit to the backend
      var remJson = {
        "token": sessionToken,
        "id": dump._id
      };

      //Splice off dump we dont want
      var index = $scope.dumps.indexOf(dump);
      $scope.dumps.splice(index, 1);

      //Save the link
      Dump.delete(remJson, function(data, status) {

        //Show a confirm Toast
        Toasty.show("Deleted " + data.content + "!");

        //Refresh our grid
        Gridify.refreshGrid();

      }, function(err) {

          //Error a toast
          Toasty.show(err.data.msg);
      });;
    }

    //Submit a dumped link
    $scope.submitLabel = function(dump) {
      var payload = {
        "token": sessionToken,
        "link": dump.content,
        "title": dump.newLabel
      }
      Labels.save(payload, function(data) {
        var index = $scope.dumps.indexOf(dump);
        $scope.dumps[index].labels.push(data);
        dump.newLabel = "";

        //Refresh our grid
        Gridify.refreshGrid();
      }, function(err) {

          //Toast the error
          Toasty.show(err.data.msg);
      });
    }

    $scope.filterLabel = function(label){
        $scope.enteredFind = label.title;
        $scope.findInput = true;

        //Refresh our grid
        Gridify.refreshGrid();
    }

    $scope.removeLabel = function(dump, label) {
      var payload = {
        "token": sessionToken,
        "dumpId": dump._id,
        "id": label._id
      }
      Label.delete(payload, function(data) {
        var i1 = $scope.dumps.indexOf(dump);
        var i2 = $scope.dumps[i1].labels.indexOf(label);
        $scope.dumps[i1].labels.splice(i2, 1);

        //Refresh our grid
        Gridify.refreshGrid();

      }, function(err) {

          //Toast the error
          Toasty.show(err.data.msg);
      });
    }

    //Function to increase the amount of display links
    var loading = false;
    var timeout = 750;
    $scope.infiniteScroll = function() {

        //Stop spamming of link increases
        if(loading) return;

        loading = true;

        //Increase display links
        $timeout(function () {

            $scope.displayLinks = $scope.displayLinks + displayRate;

            //Refresh our grid
            Gridify.refreshGrid();
            loading = false;
        }, timeout);
    }


  });
