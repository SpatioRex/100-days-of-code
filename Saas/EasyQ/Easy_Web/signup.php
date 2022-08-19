<?php

/**
 * @author Rajan Jha
 * @copyright 2018
 */
      session_start();
    date_default_timezone_set("Asia/Katmandu");
    require_once("conn.php");
    
    if(isset($_POST['fullname']))
    {
         $name = htmlentities($_POST['fullname']);
         $email = htmlentities($_POST['email']);
         $gender = htmlentities($_POST['gender']);
         $dob = htmlentities($_POST['dob']); 
         $password = htmlentities($_POST['password']);
         $password2 = htmlentities($_POST['retypepassword']);
         $latitude = htmlentities($_POST['latitude']);
         $longitude = htmlentities($_POST['longitude']);
         $contact = htmlentities($_POST['contact']);
         $p = md5($password);
         $ip = $_SERVER['REMOTE_ADDR'];
         $r = array('a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9');
         shuffle($r);
         $activation_id = "";
         for($i=0;$i<5;$i++)
         {
            $activation_id .= $r[$i];
         }
         
           ob_start();  
           //Get the ipconfig details using system commond  
           system('ipconfig /all');  
           // Capture the output into a variable  
           $mycomsys=ob_get_contents();  
           // Clean (erase) the output buffer  
           ob_clean();  
           $find_mac = "Physical"; //find the "Physical" & Find the position of Physical text  
           $pmac = strpos($mycomsys, $find_mac);  
           // Get Physical Address  
           $macaddress=substr($mycomsys,($pmac+36),17);    
         
         $date_of_creation = date('Y-m-d');
         $check_email = "select count(*) from registered_users where email='$email'";
         $r = mysqli_query($con,$check_email) or die(mysqli_error($con));
         $yuu = mysqli_fetch_row($r) or die(mysqli_errno($con));
         $e = $yuu[0];
         
         $check_contact = "select count(*) from registered_users where contact_number='$contact'";
         $dg = mysqli_query($con,$check_contact) or die(mysqli_error($con));
         $pp = mysqli_fetch_row($dg) or die(mysqli_errno($con));
         $f = $pp[0];
         
         
         $sql = "";
         if($name=="" || $email=="" || $password =="" || $password2 == "")
         {
            echo 'PLEASE COMPLETE THE FIELDS BEFORE SUBMISSION.';
         }
         else if(ctype_space($name) || ctype_space($email) || ctype_space($password) || ctype_space($password2))
         {
            echo 'PLEASE COMPLETE THE FIELDS BEFORE SUBMISSION.';
         }
         else if($e > 1)
         {
            echo 'EMAIL-ID ALREADY IN USE.';
         }
         else if($f > 1)
         {
            echo 'CONTACT NUMBER ALREADY IN USE';
         }
         else if(!filter_var($email, FILTER_VALIDATE_EMAIL))
         {
           echo 'ENTER A VALID EMAIL.';
         }
         else if(strlen($password) < 6 || strlen($password) > 25)
         {
            echo 'PASSWORD MUST CONTAIN 6-25 CHARACTERS';
         }
         else if($password != $password2)
         {
         echo 'ENTER SAME PASSWORD IN BOTH FIELD';
         }
        else
        {
            if(mysqli_query($con,"INSERT INTO registered_users VALUES('', '$name','$contact','$email','$p','$dob','$date_of_creation','$latitude','$longitude','$gender','$ip','$macaddress','','$activation_id')"))
            {
                echo 1;
            }
            else
            {
                echo 0;
            }
        
        }
    }


if(isset($_POST['email']))
{
    $email = $_POST['email'];
    $password = $_POST['password'];
    $md5pass = md5($password);
    
    $query = "SELECT password from registered_users where email='$email'";
    $quer = mysqli_query($con,$query) or die(mysqli_error($con));
    $num = mysqli_affected_rows($con);
    if($num < 1)
    {
        echo 0;
    }
    else
    {
        $data = mysqli_fetch_assoc($quer) or die(mysqli_error($con));
        $got_password = $data['password'];
        
        if($md5pass == $got_password)
        {
                $_SESSION['email'] = $email;
             echo 1;
        }
        else
        {
            echo 2;
        }
    }
    
}


if(isset($_POST['code']))
{
    session_start();
    $code = $_POST['code'];
    $eme = $_SESSION['email'];
    $ro = "select activation_id from registered_users where email='$eme'";
    $hg = mysqli_query($con,$ro) or die(mysqli_error($con));
    $gkl = mysqli_fetch_assoc($hg) or die(mysqli_error($con));
    
    if($gkl['activation_id'] == $code)
    {
        $bn = "update registered_users set activated='1' where email='$eme'";
        if(mysqli_query($con,$bn))
        {
            $_SESSION['activate'] = 1;
            echo 1;
        }
        else
        {
            echo 2;
        }
    }
    else
    {
        echo 0;
    }
}


if(isset($_POST['queuename']))
{
    session_start();
    $queuename = htmlentities($_POST['queuename']);
    $starthour = htmlentities($_POST['starttime']);
    $endhour = htmlentities($_POST['endtime']);
    $latitude = $_POST['latitude'];
    $longitude = $_POST['longitude'];
    
    if(!(ctype_space($queuename) || ctype_space($starthour) || ctype_space($endhour)))
    {
        $b = $_SESSION['email'];
        $gh = "SELECT id from registered_users where email='$b'";
        $bd = mysqli_query($con,$gh) or die(mysqli_error($con));
        $vb = mysqli_fetch_assoc($bd) or die(mysqli_error($con));
        $merchantid = $vb['id'];
        $ip = $_SERVER['REMOTE_ADDR'];
        $startseconds = strtotime('+'.$starthour.'hours');
        $endseconds = strtotime('+'.$endhour.'hours');
        ob_start();  
           //Get the ipconfig details using system commond  
        system('ipconfig /all');  
           // Capture the output into a variable  
        $mycomsys=ob_get_contents();  
           // Clean (erase) the output buffer  
        ob_clean();  
        $find_mac = "Physical"; //find the "Physical" & Find the position of Physical text  
        $pmac = strpos($mycomsys, $find_mac);  
           // Get Physical Address  
        $macaddress=substr($mycomsys,($pmac+36),17);
        
            if(($endseconds - $startseconds) >= 3600)
            {
                $ins = "INSERT INTO queue_relatime VALUES('$merchantid','','$queuename','$startseconds','$endseconds','$latitude','$longitude','$ip','$macaddress','','')";
                
                 if(mysqli_query($con,$ins))
                 {
                   echo 1;
                 }
                 else
                 {
                    echo 5;
                 }
                  
            }
            else
            {
                echo 4;
            }
    }
    else
    {
        echo 2;
    }
}

if(isset($_POST['search']))
{
    $search = htmlentities($_GET['search']);
    $zas = "Select * from queue_relatime where queuename like '%$search%' ORDER BY hits DESC limit 0,10";
    $ert = mysqli_query($con,$zas) or die(mysqli_error($con));
     $n = mysqli_num_rows($ert);
     
     for($i=0;$i<$n;$i++)
     {
        $xwq = mysqli_fetch_assoc($ert) or die(mysqli_error($con));
        echo $xwq['queuename'].'<br>Started @ '.date('h:i A-d-m-y',$xwq['start_time']).' and will end @ '.date('h:i A-d-m-y',$xwq['end_time']).'<hr>';
     }
    
}


?>