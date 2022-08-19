<?php
date_default_timezone_set('Asia/Kolkata');
require_once('conn.php');
if(isset($_POST['search']))
{
    $search = htmlentities($_POST['search']);
    $zas = "Select * from queue_relatime where queuename like '%$search%' ORDER BY hits DESC limit 0,5";
    $ert = mysqli_query($con,$zas) or die(mysqli_error($con));
     $n = mysqli_num_rows($ert);
     
     for($i=0;$i<$n;$i++)
     {
        $xwq = mysqli_fetch_assoc($ert) or die(mysqli_error($con));
        echo '<a id="searchRes" href="queue.php?queueid='.$xwq['queue_id'].'">'.$xwq['queuename'].'<br>Started @ '.date('h:i A-d-m-y',$xwq['start_time']).' and will end @ '.date('h:i A-d-m-y',$xwq['end_time']).'<br>Queue Id: '.$xwq['queue_id'].'<hr></a>';
     }
    
}

?>