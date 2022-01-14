const Jimp = require('jimp');
const inquirer = require('inquirer');
const fs = require('fs');

const outputFileSufix = '-with-watermark';
const imagesFolder = 'img/';
const brightnessIncreaseFactor = .2;
const contrastIncreaseFactor = .2;
const messages = {
  welcome: 'Hi! Welcome to "Watermark manager". Copy your image files to ' + imagesFolder + ' folder. Then you\'ll be able to use them in the app. Are you ready?',
  notSuchFiles: '\nFollowing file(s) seem(s) to not exist: ',
  restart: '\nProgram is going to restart, so you can try again.\n\n',
  error: '\nSomething went wrong... Try again!\n\n',
  success1: '\nDone! Check ',
  success2: '.\nNow You can try with another image.\n\n',
};

const addTextWatermarkToImage = async function(inputFile, outputFile, text, editOptions) {
  try {
    let image = Jimp.read(inputFile);
    let font = Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    image = await image;
    font = await font;
    const textData = {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    };
    image.print(font, 0, 0, textData, image.getWidth(), image.getHeight());
    if(editOptions && editOptions.length){
      editImage(image, editOptions);
    }
    image.quality(100).writeAsync(outputFile);
  } catch(e) {
    process.stdout.write(messages.error);
    process.exit();
  }
  process.stdout.write(messages.success1 + outputFile + messages.success2);
  startApp();
};

const addImageWatermarkToImage = async function(inputFile, outputFile, watermarkFile, editOptions) {
  try {
    let image = Jimp.read(inputFile);
    let watermark = Jimp.read(watermarkFile);
    image = await image;
    watermark = await watermark;
    const x = image.getWidth() / 2 - watermark.getWidth() / 2;
    const y = image.getHeight() / 2 - watermark.getHeight() / 2;
    image.composite(watermark, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 0.5,
    });
    if(editOptions && editOptions.length){
      editImage(image, editOptions);
    }
    image.quality(100).writeAsync(outputFile);
  } catch(e) {
    process.stdout.write(messages.error);
    process.exit();
  }
  process.stdout.write(messages.success1 + outputFile + messages.success2);
  startApp();
};

const editImage = (image, editOptions) => {
  for(const option of editOptions) {
    switch (option) {
    case 'Make image brighter': {
      image.brightness(brightnessIncreaseFactor);
      break;
    }
    case 'Increase contrast': {
      image.contrast(contrastIncreaseFactor);
      break;
    }
    case 'Make image b&w': {
      image.greyscale();
      break;
    }
    case 'Invert image': {
      image.invert();
      break;
    }
    default:
      break;
    }
  }
};

const prepareOutputFilename = inputFilename => {
  const inputFileNameParts = inputFilename.split('.');
  if(inputFileNameParts.length > 1){
    const extension = inputFileNameParts.pop();
    return inputFileNameParts.join('.') + outputFileSufix + '.' + extension;
  } else {
    return inputFilename + outputFileSufix;
  }
};

const checkIfFilesExist = (...paths) => {
  const nonExistingPaths = paths.filter(path =>
    !fs.existsSync(path) || path === imagesFolder
  );
  nonExistingPaths.length && process.stdout.write(messages.notSuchFiles + nonExistingPaths.join(', ') + '.');
  return !nonExistingPaths.length;
};

const getConfirm = () => (
  inquirer.prompt([{
    name: 'start',
    message: messages.welcome,
    type: 'confirm'
  }])
);

const getOptions = () => (
  inquirer.prompt([{
    name: 'inputImage',
    type: 'input',
    message: 'What file do you want to mark?',
    default: 'test.jpg',
  }, {
    name: 'watermarkType',
    type: 'list',
    message: 'What type of watermark would you add?',
    choices: ['Text watermark', 'Image watermark'],
  }, {
    name: 'shouldBeEdited',
    message: 'Apart from adding a watermark, would you like to edit an image?',
    type: 'confirm'
  }])
);

const getEditOptions = () => (
  inquirer.prompt([{
    name: 'optionNames',
    type: 'checkbox',
    message: 'How would you like to edit an image?',
    choices: ['Make image brighter', 'Increase contrast', 'Make image b&w', 'Invert image'],
  }])
);

const getWatermarkText = () => (
  inquirer.prompt([{
    name: 'value',
    type: 'input',
    message: 'Type your watermark text:',
  }])
);

const getWatermarkImage = () => (
  inquirer.prompt([{
    name: 'filename',
    type: 'input',
    message: 'Type your watermark name:',
    default: 'logo.png',
  }])
);

const applyWatermark = async (inputImagePath, outputImagePath, options) => {
  let haveToRestart = true;
  if(options.watermarkType === 'Text watermark') {
    const text = await getWatermarkText();
    if(checkIfFilesExist(inputImagePath)) {
      haveToRestart = false;
      addTextWatermarkToImage(inputImagePath, outputImagePath, text.value, options.selectedOptions);
    }
  } else {
    const watermarkImage = await getWatermarkImage();
    const watermarkImagePath = imagesFolder + watermarkImage.filename;
    if(checkIfFilesExist(inputImagePath, watermarkImagePath)){
      haveToRestart = false;
      addImageWatermarkToImage(inputImagePath, outputImagePath, watermarkImagePath, options.selectedOptions);
    }
  }
  if(haveToRestart) {
    process.stdout.write(messages.restart);
    startApp();
  }
};

const startApp = async () => {
  const confirm = await getConfirm();
  if(!confirm.start){
    process.exit();
  }
  const options = await getOptions();
  if(options.shouldBeEdited){
    const selectedOptions = await getEditOptions();
    options.selectedOptions = selectedOptions.optionNames;
  }
  const inputImagePath = imagesFolder + options.inputImage;
  const outputImagePath = imagesFolder + prepareOutputFilename(options.inputImage);
  applyWatermark(inputImagePath, outputImagePath, options);
};

startApp();
