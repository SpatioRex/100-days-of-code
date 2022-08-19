$(function()
{   
    $("#signup").click(function()
    {
        //alert("Rajan");
         var letters = /^[A-Za-z\s]+$/
        var fullname = $("#fullname").val();
        var email =$("#signupEmail").val();
        var checkname = document.signupformH.fullname;
        var gender = $("#gender").val();
        var dob = $("#dob").val();
        var password = $("#signuppassword").val();
        var retypepassword = $("#retypepassword").val();
        var contact = $("#contactNumber").val();
        var latitude = $("#locationBar").data("latitude");
        var longitude = $("#locationBar").data("longitude");
        
        if(checkname.value.match(letters))
        {
             $.post("signup.php",{fullname:fullname,email:email,gender:gender,dob:dob,password:password,retypepassword:retypepassword,contact:contact,latitude:latitude,longitude:longitude},function(data)
             {
                 if(data == 1)
                 {
                    alert("YOU HAVE SUCCESSFULLY SIGNED UP. AN ACTIVATION CODE HAS BEEN SENT TO YOUR EMAIL. PLEASE LOG IN TO YOUR ACCOUNT AND ENTER THE CODE TO VERIFY YOUR ACCOUNT AND COMPLETE THE SIGN UP PROCESS.");
                    $("#signupForm").fadeOut();
                    $("#cover").fadeOut();
                    $("#signup").closest('form').find("input[type=text], input[type=password],input[type=email],input[type=number").val("");
                 }
                 else if(data == 0)
                 {
                    alert("SOMETHING WENT WRONG. PLEASE TRY AGAIN LATER.");
                 }
                 else
                 {
                     alert(data)
                 } 
             });
        }
        else
        {
            alert("YOUR NAME MUST CONTAIN LETTERS ONLY.");
        }
     });
 });