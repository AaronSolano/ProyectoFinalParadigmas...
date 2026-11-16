import '@testing-library/jest-dom/vitest';

// jsdom has no native dialog lifecycle; browser coverage verifies focus/inertness.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
