<?php
require_once('conn.php');
session_start();
if(isset($_SESSION['email']) == 0)
{
    header('Location:index.php');
}

if(isset($_SESSION['activate']))
{
    if($_SESSION['activate'] == 0)
    {
        header('Location:activate.php');
    }
}
else
{
    $em = $_SESSION['email'];
    $qn = "select activated from registered_users where email='$em'";
    $check = mysqli_query($con,$qn) or die(mysqli_error($con));
    $bn = mysqli_fetch_assoc($check) or die(mysqli_error($con));
    $_SESSION['activate'] = $bn['activated'];
    header('Location:user.php');
}


$em = $_SESSION['email'];
$qk = "Select id,name from registered_users where email='$em'";
$vc = mysqli_query($con,$qk) or die(mysqli_error($con));
$xc = mysqli_fetch_assoc($vc);
$name = $xc['name'];
$id = $xc['id'];
$_SESSION['id'] = $id;

?>

<!Doctype HTML>

<html>
<head>
<link href="https://fonts.googleapis.com/css?family=Pacifico|Bangers|Gloria+Hallelujah" rel="stylesheet"/>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
<script type="text/javascript" src="jquery-1.11.0.min.js"></script>
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
          $("#queueFormHolder").fadeOut();
          $("#searchHolder").fadeOut();
          
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
<script type="text/javascript" src="user.js"></script>
<script type="text/javascript" src="search.js"></script>
<link rel="stylesheet" href="index.css" />
</head>

<body>

<div id="cover"></div>

<div id="container">


<div id="header">
<form id="searchForm" onsubmit="return false;">
<div >
<div class="input-group mb-3" style="width: 150%;position: absolute;top: 30%;left: -45%;">
  <input type="text" class="form-control" placeholder="Search Queue Here" id="searchField" name="searchField"/>
  <div class="input-group-append"  style="cursor: pointer;">
    <span class="input-group-text" id="search"><img src="search.png" /></span>
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



<div id="queuebuttonHolder">
<button class="btn btn-primary" style="position: relative;width: 100%;" id="joinButton">Join A Queue</button>
<hr color="white" size="2"/>
<button class="btn btn-primary" style="position: relative;width: 100%;" id="createButton">Create A Queue</button>
</div>

<div id="account" style="color: #000000;">
<h3>Logged in as: <?php echo $name; ?></h3><br />
<?php echo $em; ?>
</div>

<div id="holder">
<button class="btn btn-warning" style="position: relative;width: 50%;" id="search_for_queue_button">Search For Queue</button></label><br /><br />
<h3 style="color: #000000;"> OR </h3><br />
<label for="codeField" style="color: #000000;">Enter the queue code</label><br />
 <input type="number" class="form-control" id="codeField" placeholder="Enter the queue code" name="codeField" style="float: left;width: 30%;position: relative;left: 25%;" />
 <button class="btn btn-primary" style="width: 18%;">Join</button>
</div>

<div id="queueFormHolder" onsubmit="return false;">

<form name="queueForm">
<div class="form-group" id="queuenameHolder" >
    <label for="queuename">Queue Name</label>
    <input type="text" class="form-control" id="queuename"  placeholder="Enter Queue Name" name="queuename" required />
  </div>
  <div class="form-group" id="startTime">
    <label for="startime">You want to start the queue after</label>
    <input type="number" class="form-control" id="starttime"  name="starttime" min="0" step="1" max="23" value="0" required /><b>hours</b>
  </div>
  <div class="form-group" id="endTimeanddate">
    <label for="password">You want to end the queue after</label>
    <input type="number" class="form-control" id="endtime"  name="endtime" min="1" step="1" max="23" value="23" /> <b>hours</b><br />
  <small>Your queue validity will be for 24 hours only. You can further increase the duration.</small>
  </div>
   <div class="form-group" id="googleMapHolder">
   <label for="googleMap">Choose Your Location</label><br />
   <small>Click on the location to set the marker where you want to start a queue. Your location is required for users to join your queue. You cannot create a queue without a location.</small>
   <div id="googleMap"></div>
   </div>
  <button type="submit" class="btn btn-warning" name="createqueue" id="createqueue" style="float: right;margin-right: 3%;margin-bottom: 2%;">Create</button><br /><br />
</form>
</div>

<div id="feed">
<div id="queuesstarted" style="float: left;padding: 6%;">

<?php
$bb = "select count(*) from queue_relatime where merchant_id='$id'";
$cd = mysqli_query($con,$bb) or die(mysqli_error($con));
$nk = mysqli_fetch_row($cd);

if($nk[0] > 0)
{
    $bn = mysqli_query($con,"select * from queue_relatime where merchant_id='$id'") or die(mysqli_error($con));
    $kk = mysqli_fetch_assoc($bn) or die(mysqli_error($con));
    echo 'You have created a queue named <b>'.$kk['queuename'].'</b> <hr/>';
    
    $startedhours = (time() - $kk['start_time'])/3600;
    $endedhours = ($kk['end_time'] - time())/3600;
    
    if($startedhours < 1)
    {
        echo 'The queue was started '.ceil((time() - $kk['start_time'])/60).' minutes ago.<hr>';
    }
    else
    {
        echo 'The queue was started '.ceil($startedhours).' hours ago.<hr>';
    }
    
    if($endedhours < 1)
    {
        echo 'The queue will end after '.ceil((($kk['end_time'] - time())/60)-1).' minutes.<hr>';
    }
    else
    {
        echo 'The queue will end after '.ceil($endedhours - 1)  .' hours.<hr>';
    }
}
else
{
    echo 'You have not created any queue.<hr>';
}
   
 ?>

</div>
<div id="queuesjoined" style="float: right;">
Not Joined any queue.
</div>
</div>

<div id="searchHolder">

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
<script type="text/javascript">
<script>

</script>

<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBffUejp_7yfBdW_Xab5b6sQYvnUkNUcko&callback=myMap"></script>

</body>

</html>