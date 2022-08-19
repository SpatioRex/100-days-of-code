$(function()
{
   //alert("Rajan");
   
   $("#activate").click(function()
   {
     code = $("#activateField").val();
     $.post('signup.php',{code:code},function(data)
     {
        if(data == 1)
        {
            alert("ACTIVATED.");
            window.location = "user.php";
        }
        else if(data == 0)
        {
            alert("WRONG ACTIVATION CODE. PLEASE TRY AGAIN.");
        }
        else if(data == 2)
        {
            alert("SOMETHING WENT WRONG. PLEASE TRY AGAIN.");
        }
     });
   })
});

//