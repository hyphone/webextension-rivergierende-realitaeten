let inputInActive = document.getElementById('inputInActive');

let inputValues = {
  bInActive: false
}

async function setValues(){
  inputValues = {
    bInActive: inputInActive.checked
  }
  await browser.storage.local.set({ inputValues });
}

async function init(){
  let { inputValues } = await browser.storage.local.get('inputValues');

  if (!inputValues){
    inputValues = {
      bInActive: false
    }
  }

  inputInActive.checked = inputValues.bInActive;

  inputInActive.addEventListener('keyup', setValues);
  inputInActive.addEventListener('click', setValues);

  setValues();
}

init().catch(e => console.error(e));