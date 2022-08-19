<?php 
session_start();
date_default_timezone_set("Asia/Kolkata"); 
require_once('conn.php');


if(isset($_SESSION['email']) == 1)
{
    header('Location:user.php');
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

      var loc = 0,x = 0,y = 0,loc1;
      
      function initMap(){
       //HTML5 geolocation.
        if (navigator.geolocation) {
            
           document.getElementById("locationBar").innerHTML = 'Loading...';
           document.getElementById("signupLocation").innerHTML = 'Loading...';
          navigator.geolocation.getCurrentPosition(function(position){
            //Distance-matrix code Here...
            
           x = position.coords.latitude;
           y = position.coords.longitude;
           
           $("#locationBar").data("latitude",x);
           $("#locationBar").data("longitude",y);
           
           var pos = {lat:x,lng:y};
           
           
          
           var geocoder = new google.maps.Geocoder;
           geocoder.geocode({'location': pos},function(result,status){
                //do nothing
                loc1 = result[0].address_components[2].short_name;
           
           document.getElementById("locationBar").innerHTML = '<img src="location.png" style="margin: 2%;" /><br/>Location: ' + loc1;
           document.getElementById("signupLocation").innerHTML = '<img src="location.png" style="margin: 2%;" /><br/>Location: ' + loc1;
           document.getElementById("signupLocation").disabled = true;
            });
            
          },function(error){
            switch(error.code) {
        case error.PERMISSION_DENIED:
            loc1 = 1;
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
     });
     
     $("#loginSignup").click(function()
     {
        
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
          event.preventDefault();
          initMap();
     });
     
     $("#forgot").click(function()
     {
        event.preventDefault();

     });
     
});
</script>
<script type="text/javascript" src="signup.js"></script>
<script type="text/javascript" src="login.js"></script>
<link rel="stylesheet" href="index.css" />
</head>

<body>

<div id="cover"></div>

<div id="container">

<div id="header">
<form>
<div id="searchForm">
<div id="customerForm">
<table id="customerFormTable">
<tr>
<td id="loginClick"><img src="login.png" /><br />Login/Sign Up</td>
<td id="locationBar"><img src="location.png" /><br />Location</td>
<td><img src="contact.png" style="margin-bottom: 8px;" /><br />Contact</td>
</tr>
</table>
</div>
</div>
</form>
</div>

<div id="logo">EasyQ </div>

<div id="loginForm">
<form onsubmit="return false;" name="loginFormH">
<div class="form-group" id="emailHolder">
    <label for="email">Email address</label>
    <input type="email" class="form-control" id="email"  placeholder="Enter email" name="email" />
  </div>
  <div class="form-group" id="passwordHolder">
    <label for="password">Password</label>
    <input type="password" class="form-control" id="password" placeholder="Password" name="password" />
  </div>
  <input type="submit" class="btn btn-warning" name="login" id="login" style="float: right;margin-right: 3%;margin-bottom: 2%;" value="Submit" /><br /><br />
  <button class="btn btn-light" name="loginSignup" id="loginSignup" style="float: left;">New User? Create An Account</button>
  <button class="btn btn-light" name="forgot" id="forgot" style="float: right;">Forgot Password</button>

</form>
</div>

<div id="signupForm">
<form onsubmit="return false;" name="signupformH">
<div class="form-group" id="fullnameHolder">
    <label for="fullname">Fullname</label>
    <input type="text" class="form-control" id="fullname"  placeholder="Enter your fullname here" name="fullname" required />
</div>
<div class="form-group" id="signupEmailHolder">
    <label for="signupEmail">Email</label>
    <input type="email" class="form-control" id="signupEmail" placeholder="Enter your email address here" name="signupEmail" required />
</div>
<div class="form-group" id="passwordHolder">
    <label for="password">Password</label>
    <input type="password" class="form-control" id="signuppassword" placeholder="Enter password here" name="signupEmail" required />
</div>
<div class="form-group" id="retypepasswordHolder">
    <label for="retypepassword">Retype Password</label>
    <input type="password" class="form-control" id="retypepassword" placeholder="Retype Password here" name="signupEmail" required />
</div>
<div class="form-group" id="dobHolder">
    <label for="dob">Date of Birth</label>
    <input type="date" class="form-control" id="dob" placeholder="Enter your email address here" name="dob" required />
</div>
<div class="form-group" id="contactHolder">
    <label for="dob">Contact Number</label>
    <input type="number" class="form-control" id="contactNumber" aria-describedby="contactHelp" min="1000000000" placeholder="Enter your contact number here" name="contactNumber" required />
<small style="color: white;" id="contactHelp" class="form-text">Enter your number with country code. For Ex - 00977-987XXXXXXX</small>
</div>
<div class="form-group" id="genderHolder">
    <label for="gender">Gender</label>
    <select id="gender" class="form-control">
    <option value="M" selected>Male</option>
    <option value="F">Female</option>
    <option value="O">Others</option>
    </select>
</div>
<button class="btn btn-light" name="signupLocation" id="signupLocation" style="float: left;width: 100%;"><img src="location.png" style="margin: 2%;" />Location</button>
<input type="submit" class="btn btn-warning" name="signup" id="signup" value="Sign Up" style="float: right; margin-top: 2%;margin-right: 3%;margin-bottom: 2%;" />
<button class="btn btn-light" name="signupLogin" id="signupLogin" style="float: left; margin-top: 2%;">Already Have an Account</button><br />
<button class="btn btn-light" name="forgot" id="forgotSignup" style="float: right;position: relative;top: 10px;margin:0px 7px 0px 7px;">Forgot Password?</button>
</form>
</div>

<img src="homeQuotes.jpg" style="position: absolute; top: 15%; left: 3.5%; float: left;width: 58%;" />

<div id="trending">
<div id="heading" class="trendingItem" style="background: linear-gradient(#007DA8,#3366FF);color: #FFF;"> <h4>#Trending</h4> </div>
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