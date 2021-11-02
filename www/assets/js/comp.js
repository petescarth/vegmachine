$('#terms').on("click", function() {
  if ($('#terms').prop('checked') === true) {
    $('#comp-submit').prop('disabled', false);
  } else {
    $('#comp-submit').prop('disabled', true);
  }
})

$('#comp-submit').click(function() {
  enterComp(document.getElementById('comp-name').value,
    document.getElementById('comp-property').value,
    document.getElementById('comp-address').value,
    document.getElementById('comp-phone').value,
    document.getElementById('comp-email').value);
})


// POST REQUEST
function enterComp(name, property, address, phone, email) {
  if (email === '') {
    $('#emailAlert').modal('toggle');
    $('#emailAlert').css("z-index", parseInt($('.modal-backdrop').css('z-index')) - 1);
    return;
  }

  $('#competitionModal').modal('toggle');
  $.ajax({
    url: 'http://vegcover.com/vmemail',
    type: "POST",
    statusCode: {
      500: function() {
        $('#serverAlert').modal('toggle');
      }
    },
    data: {
      userEmail: email,
      userName: name,
      propertyName: property,
      userPhone: phone,
      propertyAddress: address
    },
    success: function() {
     //$('#compAlert').modal('toggle');
    }
  });
}