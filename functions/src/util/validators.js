const user = require("../routes/user");

const isEmail = (email) => {
  const regEx =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};

const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

function validateSignupData(data) {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  if (isEmpty(data.handle)) errors.handle = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
}

function validateLogindata(data) {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
}

function reduceUserDetails(data) {
  let userDetails = {};
  console.log(data)
  if (data.bio && !isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (data.website && !isEmpty(data.website.trim())) {
    if (data.website.trim().substring(0, 4) !== "http")
      userDetails.website = `http://${data.website.trim()}`;
    else userDetails.website = data.website;
  }
  if (data.gender && !isEmpty(data.gender.trim()))
    userDetails.gender = data.gender;
  if (data.contactNumber && !isEmpty(data.contactNumber.trim()))
    userDetails.contactNumber = data.contactNumber;
  if (data.name && !isEmpty(data.name.trim())) userDetails.name = data.name;
  if (data.collage && !isEmpty(data.collage.trim()))
    userDetails.collage = data.collage;
  if (data.city && !isEmpty(data.city.trim())) userDetails.city = data.city;
  if (data.state && !isEmpty(data.state.trim())) userDetails.state = data.state;

  userDetails.skills = [];
  if (data.skills && data.skills.length > 0)
    data.skills.forEach((skill) => {
      if (!isEmpty(skill.trim())) userDetails.skills.push(skill);
    });

  userDetails.projects = [];
  if (data.projects && data.projects.length > 0)
    data.projects.forEach((project) => {
      if (!isEmpty(project.trim())) userDetails.projects.push(project);
    });

  if (data.onlinePlateform && Object.keys(data.onlinePlateform).length !== 0)
    userDetails.onlinePlateform = data.onlinePlateform;
  else userDetails.onlinePlateform = {};
  return userDetails;
}

module.exports = {
  validateSignupData,
  validateLogindata,
  reduceUserDetails,
};
