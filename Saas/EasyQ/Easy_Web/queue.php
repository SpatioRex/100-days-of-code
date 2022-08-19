<?php

/**
 * @author Rajan Jha
 * @copyright 2018
 */
 


?>



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

<div id="account" style="color: #000000;">
<h3>Logged in as: <?php echo $name; ?></h3><br />
<?php echo $em; ?>
</div>



<div id="queuesstarted" style="float: left;padding: 6%; position: absolute; top: 10%;left: 30%;">

<?php
if(isset($_GET['queueid']))
{
    require_once('conn.php');
    
    $qid = $_GET['queueid'];
    
    $iaw = "Select * from queue_relatime where queue_id='$qid'";
    $cdc = mysqli_query($con,$iaw) or die(mysqli_error($con));
    $aqw = mysqli_fetch_assoc($cdc) or die(msyqli_error($con));
    
    if(mysqli_affected_rows($con) < 1)
    {
        header('Location:user.php');
    }
    
    $startedhours = (time() - $aqw['start_time'])/3600;
    $endedhours = ($aqw['end_time'] - time())/3600;
    if($_SESSION['id'] != $aqw['merchant_id'])
    {
        echo '<div id="displayer"><h1>'.$aqw['queuename'].'</h1><hr>Queue id:'.$aqw['queue_id'].' <button id="jointhequeue" class="btn btn-success">Join</button><br>';
          if($startedhours < 1)
    {
        echo 'The queue was started '.ceil((time() - $aqw['start_time'])/60).' minutes ago.<hr>';
    }
    else
    {
        echo 'The queue was started '.ceil($startedhours).' hours ago.<hr>';
    }
    
    if($endedhours < 1)
    {
        echo 'The queue will end after '.ceil((($aqw['end_time'] - time())/60)-1).' minutes.<hr>';
    }
    else
    {
        echo 'The queue will end after '.ceil($endedhours - 1)  .' hours.<hr>';
    }
    }
    else
    {
        echo '<div id="displayer"><h1>'.$aqw['queuename'].'</h1><br><small style="Color: red;">You have started the queue.</small><hr>Queue id:'.$aqw['queue_id'].'<br>';
          if($startedhours < 1)
    {
        echo 'The queue was started '.ceil((time() - $aqw['start_time'])/60).' minutes ago.<hr>';
    }
    else
    {
        echo 'The queue was started '.ceil($startedhours).' hours ago.<hr>';
    }
    
    if($endedhours < 1)
    {
        echo 'The queue will end after '.ceil((($aqw['end_time'] - time())/60)-1).' minutes.<hr>';
    }
    else
    {
        echo 'The queue will end after '.ceil($endedhours - 1)  .' hours.<hr>';
    }
    }
}
   
 ?>
 
 <br />
 

</div>



<div id="searchHolder">

</div>



</div>
<script type="text/javascript">

</script>

<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBffUejp_7yfBdW_Xab5b6sQYvnUkNUcko&callback=myMap"></script>

</body>

</html>