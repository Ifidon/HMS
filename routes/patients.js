var express = require('express');
var mongoose = require('mongoose');
var Patients =  require('../models/patients');

var authorize = require('../authorize');


var patientRouter = express.Router();


var fs = require('fs');


var multer = require('multer');

var storage = multer.diskStorage({
  destination: (rea, file, cb) => {
    cb(null, 'public/images/patients');
  },

  // filename: (req, file, cb) => {
  //  cb(null, file.originalname)
  // }
});

var imageFileFilter = (req, file, cb, err) => {
  if(!file.originalname.match(/\.(jpg|jpeg|png|gif|JPG|JPEG|PNG|GIF)$/)) {
    return cb(new Error('Only Image files allowed!'))
    next(err)
    
  }
  cb(null, true)
};

var upload = multer({
  storage: storage,
  fileFilter: imageFileFilter
});

patientRouter.route('/')
.get(authorize.fdaccess, (req, res) => {
  Patients.find()
  .then((patients) => {
    res.render('patientslist', {patientlist: patients.reverse()})
  })
});

patientRouter.route('/registration')
.get(authorize.fdaccess, (req, res) => {
  res.render('regpatient');
})

.post(upload.single('passport'), (req, res, next) => {
  Patients.create(req.body)
  .then((patient) => {
    if (req.file) {
      patient.set({photourl: req.file.path.slice(6), picture: {
        data: fs.readFileSync(req.file.path),
        contentType: 'image/jpg'
      }})
      patient.save()
      // console.log(patient)
    }
    else {
      patient.set({photourl: './public/images/defaultuser.jpg', picture: {
        data: fs.readFileSync('./public/images/defaultuser.jpg'),
        contentType: 'image/jpg'
      }})
      patient.save()
      // console.log(patient)
    }
    // console.log("New Patient Registered Successfully! ");
    res.redirect('/patients');
  })
});

patientRouter.route('/:patient_id')
.get(authorize.fdaccess, (req, res) => {
  Patients.findOne({patient_id: req.params.patient_id})
  .then((patient) => {
    res.render('patientview', {patient, message: " "})
  })
});

patientRouter.route('/:patient_id/update')
.get(authorize.fdaccess, (req, res) => {
  Patients.findOne({patient_id: req.params.patient_id})
  .then((patient) => {
    res.render('update', {patient})
    // console.log(patient)
  })
})

.post((req, res) => {
  Patients.updateOne({patient_id: req.params.patient_id}, {$set: req.body})
  .then((patient) => {
    // console.log(patient)
    res.redirect('/patients')
  })

});

patientRouter.route('/:patient_id/recordvitals')
.get(authorize.nurseaccess, (req, res) => {
  Patients.findOne(req.params)
  .then((patient) => {
    // console.log(req.params)
    res.render('recordVitals', {patient})
  })
  
})


patientRouter.route('/:patient_id/consultations')
.get(authorize.draccess, (req, res) => {
  Patients.findOne(req.params)
  .then((patient) => {
    res.render('consultations', {patient})
    // console.log(res.header)
  })
  })

  .post((req, res) => {
      Patients.findOne(req.params)
      .then((patient) => {
        patient.consultations.unshift(req.body)
        patient.save()
        res.redirect('/patients/' + patient.patient_id)
      })
  });

  patientRouter.route('/:patient_id/consultations/:consultation_id')
  .get(authorize.draccess, (req, res) => {
    Patients.findOne({patient_id: req.params.patient_id})
    .then((patient) => {
      if (patient.consultations.id(req.params.consultation_id).prescription) {
        var consultation = patient.consultations.id(req.params.consultation_id)
      }
      else {
        var consultation = patient.consultations.id(req.params.consultation_id)
        consultation.prescription = Object;
        consultation.labInvestigation = Object;
      }
        
        // console.log(consultation)
        res.render('consultation', {patient, consultation})
    })
  })

  .post((req, res) => {
    Patients.findOne({patient_id: req.params.patient_id})
    .then((patient) => {
      var consultation = patient.consultations.id(req.params.consultation_id)
      consultation.doctorsNote = req.body.doctorsNote
      consultation.prescription = {}
      consultation.labInvestigation = {}
      consultation.prescription.drugs = req.body.drugs
      consultation.labInvestigation.tests = req.body.tests      
      patient.save()
      // console.log(consultation)
      res.render('consultation', {patient, consultation})
    })
  })

  patientRouter.route('/:patient_id/consultations/:consultation_id/pharmacy')
  .get((req,res) => {
    Patients.findOne({patient_id: req.params.patient_id})
    .then((patient) => {
      var consultation = patient.consultations.id(req.params.consultation_id)
      // console.log(consultation.prescription)
      res.render('pharmacy', {patient, consultation})
    })
  })
//
  .post((req, res) => {
    Patients.findOne({patient_id: req.params.patient_id})
    .then((patient) => {
      // console.log(patient.firstname)
      var consultation = patient.consultations.id(req.params.consultation_id)
      consultation.prescription.cost = req.body.cost
      consultation.prescription.amountPaid = req.body.amountPaid
      consultation.prescription.balance = req.body.balance
      patient.save()
      res.render('pharmacy', {patient, consultation})
      // console.log(consultation)
  })
});
//
patientRouter.route('/:patient_id/consultations/:consultation_id/laboratory')
.get((req, res, next) => {
  Patients.findOne({patient_id: req.params.patient_id})
    .then((patient) => {
      var consultation = patient.consultations.id(req.params.consultation_id)
      // console.log(consultation.prescription)
      res.render('medlab', {patient, consultation})
    })
})
.post((req, res) => {
  Patients.findOne({patient_id: req.params.patient_id})
  .then((patient) => {
    // console.log(patient.firstname)
    var consultation = patient.consultations.id(req.params.consultation_id)
    consultation.labInvestigation.cost = req.body.cost
    consultation.labInvestigation.amountPaid = req.body.amountPaid
    consultation.labInvestigation.balance = req.body.balance
    patient.save()
    // console.log(req.body)
    res.render('medlab', {patient, consultation})
    // console.log(consultation.labInvestigation)
})
});

patientRouter.post('/dailyhistory', function(req, res, next) {
  var today = new Date();
  var day  = today.getDate();
  var nextday = day + 1
  var month = today.getMonth()+1;
  var year = today.getFullYear();
  var date = year + '-' + month + '-' + day;
  var nextday = year + '-' + month + '-' + nextday ;
  console.log(new Date(date))
  Patients.find({'consultations.updatedAt': {$gte: date, $lte: nextday}}, {firstname: 1, lastname: 1, patient_id: 1, consultations: 1})
  .then((todayspatients) => {
    res.send(todayspatients)
  })
})


module.exports = patientRouter;
