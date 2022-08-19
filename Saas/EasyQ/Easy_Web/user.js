var map = 0;
function myMap() {
    var posit = new google.maps.LatLng(28.6139, 77.2090);
    var tmap= {
        center:posit,
        zoom:7,
    };
    var themap=new google.maps.Map(document.getElementById("googleMap"),tmap);
    
    var marker = new google.maps.Marker({
              position: posit,
              map: themap,
              animation:google.maps.Animation.BOUNCE
           });
    google.maps.event.addListener(themap,'click',function(e)
    {
        
            map = 1;
            $('#googleMapHolder').data('latitude',e.latLng.lat());
             $('#googleMapHolder').data('longitude',e.latLng.lng());
            marker.setPosition(e.latLng); 
    });
}
$(function()
{

    
    $("#createButton").click(function()
    {
        //alert("Rajan");
        $("#cover").fadeIn();
        $("#queueFormHolder").fadeIn();
  
});

    $("#createqueue").click(function()
    {
        var queuename = $("#queuename").val();
        var starttime = $("#starttime").val();
        var endtime = $("#endtime").val();
        var passwordagain = $("#passwordagain").val();
        var letters = /^[A-Za-z0-9\s]+$/ 
        var check = document.queueForm.queuename;
        var latitude = $("#googleMapHolder").data("latitude");
        var longitude = $("#googleMapHolder").data("longitude");
        
        if(check.value.match(letters))
        {
            if(map == 1)
            {
                $.post('signup.php',{queuename:queuename,starttime:starttime,endtime:endtime,password:passwordagain,latitude:latitude,longitude:longitude},function(d)
                {
                    if(d == 1)
                    {
                        alert("Done");
                        window.location = "user.php";
                    }
                    else if(d == 4)
                    {
                        alert("Time Duration Of Queue Should atleast be 1 hour.");
                    }
                    else if(d == 2)
                    {
                        alert("Please complete all the fields");
                    }
                    else if(d == 5)
                    {
                        alert("Something went wrong");
                    }
            });
            }
            else if(map == 0)
            {
                alert("PLEASE SELECT YOUR QUEUE LOCATION.");
            }
        }
        else
        {
            alert("QUEUE NAME MUST CONTAIN LETTERS AND NUMBERS ONLY.")
        }
        
        
    });
    
    $("#search").click(function()
    {
        var letters = /^[A-Za-z0-9\s]+$/;
        var valr = $('#searchField').val();
        
      if(valr == "")
      {
        alert("Please enter something to search.");
      }
      else
      {
               $.post('test.php',{search:valr},function(d)
       {
                $("#cover").fadeIn();
                $("#searchHolder").fadeIn();
                $("#searchHolder").html(d);

       });
      }
    });
    
    $("#searchRes").click(function()
    {
        
    });
});

