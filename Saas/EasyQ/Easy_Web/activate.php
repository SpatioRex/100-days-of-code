<?php
require_once('conn.php');
session_start();
if(isset($_SESSION['email']) == 0 && isset($_COOKIE['email']) == 0)
{
    header('Location:index.php');
}

if(isset($_SESSION['activate']))
{
    if($_SESSION['activate'] == 1)
    {
        header('Location:user.php');
    }
}
else
{
        $em = $_SESSION['email'];

        $qn = "select activated from registered_users where email='$em'";
        $check = mysqli_query($con,$qn) or die(mysqli_error($con));
        $bn = mysqli_fetch_assoc($check) or die(mysqli_error($con));
        
        if($bn['activated'] == 0)
        {
            $_SESSION['activate'] = $bn['activated'];
            header('Location:activate.php');
        }
}




?>

<!Doctype HTML>

<html>
<head>
<link href="https://fonts.googleapis.com/css?family=Pacifico|Bangers|Gloria+Hallelujah" rel="stylesheet"/>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
<script type="text/javascript" src="jquery-1.11.0.min.js"></script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBffUejp_7yfBdW_Xab5b6sQYvnUkNUcko"></script>
<script type="text/javascript">

      var loc = 0,lati = 0,longi = 0,loc1;

      
      function initMap(){
       //HTML5 geolocation.
        if (navigator.geolocation) {
            document.getElementById("locationBar").innerHTML =  'Loading...';
          navigator.geolocation.getCurrentPosition(function(position){
            //Distance-matrix code Here...
            
           x = position.coords.latitude;
           y = position.coords.longitude;
           var pos ={lat: x, lng: y};
           var geocoder = new google.maps.Geocoder;
           geocoder.geocode({'location': pos},function(result,status){
                //do nothing
           loc1 = result[0].address_components[2].short_name;
            document.getElementById("locationBar").innerHTML = '<img src="location.png" style="margin: 2%;" /><br/>Location: ' + loc1;
            });
            
          },function(error){
            switch(error.code) {
        case error.PERMISSION_DENIED:
            
            break;
        case error.POSITION_UNAVAILABLE:
            loc1 = "Location Information Is Unavailable.";
            break;
        case error.TIMEOUT:
            loc1 = "Location Request Time Out.";
            break;
        case error.UNKNOWN_ERROR:
            loc1 = "An Unknown Error Occurred.";
            break;
    }
          });
        } else {
          // Browser doesn't support Geolocation
          alert("Something Went Wrong.");
        }
      }
$(function()
{

    $("#loginClick").click(function()
    {
        $("#cover").show();
        $("#signupForm").fadeOut();
        $("#loginForm").fadeIn("slow");
    });
    
     $("#cover").click(function()
     {
          $("#loginForm").fadeOut();
          $("#signupForm").fadeOut();
          $("#cover").fadeOut();
          $("#holder").fadeOut();
          
     });
     
     $("#close").click(function()
     {
          $("#cover").fadeOut();
          $("#bikramHolder").fadeOut();
     });
     
     $("#loginSignup").click(function()
     {
        event.preventDefault();
        $("#cover").show();
        $("#signupForm").fadeIn("slow");
        $("#loginForm").fadeOut();
     });
     
     $("#locationBar").click(function()
     {
        initMap();
     });
     
     $("#signupLocation").click(function()
     {
          initMap();
        
     });
    
     
     $("#search_for_queue_button").click(function()
     {
        $("#holder").fadeOut();
        $("#cover").fadeOut();
        $("#searchField").focus();
     });
     
     $("#joinButton").click(function()
     {
        $("#cover").fadeIn();
        $("#holder").fadeIn();
     });
});
</script>
<script type="text/javascript" src="activate.js"></script>
<link rel="stylesheet" href="index.css" />
</head>

<body>

<div id="cover"></div>

<div id="container">


<div id="header">
<form>
<div id="searchForm">
<div class="input-group mb-3" style="width: 150%;position: absolute;top: 30%;left: -45%;">
  <input type="text" class="form-control" placeholder="Search Queue Here" id="searchField"/>
  <div class="input-group-append">
    <span class="input-group-text" id="basic-addon2"><img src="search.png" /></span>
  </div>
</div>
<div id="customerForm">
<table id="customerFormTable">
<tr>
<td id="loginClick"><a href="logout.php" style="text-decoration: none;color: white;"><img src="logout.png" /><br />Logout</a></td>
<td id="locationBar"><img src="location.png" /><br />Location</td>
<td><img src="contact.png" style="margin-bottom: 8px;" /><br />Contact</td>
</tr>
</table>
</div>
</div>
</form>
</div>

<div id="logo">EasyQ </div>

<div id="holder" style="display: block;position: absolute;top: 17%;left: 2%;height: 400px;">
<br /><br /><br /><br />
<label for="codeField" style="color: #000000;"><h3>Enter the activation code sent to you via email.</h3></label><br />
 <input type="text" class="form-control" id="activateField" placeholder="Enter the activation code here" name="activateField" style="float: left;width: 30%;position: relative;left: 25%;" />
 <button class="btn btn-primary" style="width: 18%;" id="activate" name="activate">Activate</button>
</div>

<div id="trending">
<div id="heading" class="trendingItem" style="background: linear-gradient(#007DA8,#3366FF);color: #FFF;"> <h4>#Trending <img src="trending.png" /></h4> </div>
<div id="trendingItem1" class="trendingItem">Trend1</div>
<div id="trendingItem2" class="trendingItem">Trend2</div>
<div id="trendingItem3" class="trendingItem">Trend3</div>
<div id="trendingItem4" class="trendingItem">Trend4</div>
<div id="trendingItem5" class="trendingItem">Trend5</div>
<div id="trendingItem6" class="trendingItem">Trend6</div>
<div id="trendingItem7" class="trendingItem">Trend7</div>
<div id="trendingItem8" class="trendingItem">Trend8</div>
<div id="trendingItem9" class="trendingItem">Trend9</div>
<div id="trendingItem10" class="trendingItem">Trend10</div>
<div id="trendingItem12" class="trendingItem">Trend11</div>
<div id="trendingItem13" class="trendingItem">Trend12</div>
<div id="trendingItem14" class="trendingItem">Trend13</div>
</div>

</div>
</body>

</html>