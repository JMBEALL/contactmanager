// study this / discussed this pattern with Erin! => async/await unpacks the data that i want to work with. PRAISE BE!

// async getContact(num) {
//   try{
//     let contact = await fetch(`http://localhost:3000/api/contacts/${num}
//     let data = await contact.json()
//    return data
//   } catch {
//     throw errors
//   }
// }

// scoped within an IIFE to prevent global name spave pollution.
(() => {
  document.addEventListener("DOMContentLoaded", () => {
    manager.registerPartials();
    manager.getAllContacts();
    // grabbing all elements user interacts with
    let addContactSubmit = document.querySelector("#submitButton");
    let contactsDiv = document.querySelector(".contacts-container");
    let searchInput = document.querySelector("#search");

    // using input event to listen for when typing is happening in the search bar.
    searchInput.addEventListener("input", (e) => manager.filterContacts(e));

    // when user clicks the Add Contact button under the header, it renders the form to add a new contact.
    addContactSubmit.addEventListener("click", (e) =>
      manager.renderAddContactForm(e)
    );

    // listening for clicks on the contactsDiv and checking to see if it was a click to edit or delete a contact and using a conditional to call the proper instance method.
    contactsDiv.addEventListener("click", (e) =>
      manager.editOrDeleteContact(e)
    );
  });

  class ContactsManager {
    getAllContacts() {
      let compiledTemplates = this.compileTemplates();
      let contacts = fetch("http://localhost:3000/api/contacts")
        .then((res) => res.json())
        .then((json) => {
          document.querySelector(".contacts-container").innerHTML =
            compiledTemplates["contacts-template"]({ contacts: json });

          // this checks to see if the button is avaialble to grab otherwise sets it to an empty string so that the conditional fails to run.
          let addContactsButton =
            document.querySelector("#no-contacts-button") || "";

          if (addContactsButton) {
            addContactsButton.addEventListener("click", (e) => {
              // must pass the event object in, otherwise an error is thrown.
              this.renderAddContactForm(e);
            });
          }
        });
    }

    // grab all templates with the selector attribute and redice them into an object to have ready to use in function form
    compileTemplates() {
      return [
        ...document.querySelectorAll('[type="text/x-handlebars-template"]'),
      ].reduce((accum, template) => {
        if (!accum[template.id]) {
          accum[template.id] = Handlebars.compile(template.innerHTML);
        }
        return accum;
      }, {});
    }

    //register partials
    // When registering partials you pass the partial name (what it is referenced by in the html script following this symbol ">" and pass the innerHYML of the actual template you want to register)
    registerPartials() {
      Handlebars.registerPartial(
        "individual-contact-template",
        document.querySelector("#individual-contact").innerHTML
      );
      Handlebars.registerPartial(
        "no-contacts-template",
        document.querySelector("#no-contacts").innerHTML
      );
    }

    renderAddContactForm(e) {
      e.preventDefault();

      document.querySelector(".contacts-container").innerHTML =
        this.compileTemplates()["add-contact-template"]();

      // this must be below the previous line of code because the form has not rendered otherwise and you will not be able to access the element.
      let cancelButton = document.querySelector("#newContactCancel");

      // nested this here so that the elements i was working with were loaded in the DOM. Otherwise will get error.
      let newContactSubmit = document.querySelector(".add-contact");

      newContactSubmit.addEventListener("submit", (e) => {
        e.preventDefault();
        let formData = new FormData(newContactSubmit);

        // declared this and iterated over the formData returned since FormData objects use multipart content types and this API only accepts json/query strings. So this was an easy way to create an obejct populated with the correct values from the form and covert it into JSON in the object argument passed to fetch below.
        let data = {};

        // confirming my formData object is properly grabbing all input properly and giving the data object its state.
        for (let entry of formData.entries()) {
          data[entry[0]] = entry[1];
        }

        // send the data to the API endpoint by formatting an http request. Use fetch and pass in a second argument, an object, that sets up the HTTP request info. I could probably implement better error handling and render a handlebars template if an error was thrown and even pass the message to the template.
        fetch("http://localhost:3000/api/contacts/", {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        })
          .then((res) => {
            this.getAllContacts();
            console.log(res);
          })
          .catch((err) => console.log(err));
      });

      // event listener for the cancel button which takes us back to the home page with all of out contacts.
      cancelButton.addEventListener("click", (e) => {
        this.getAllContacts();
      });
    }

    editOrDeleteContact(e) {
      if (e.target.nodeName !== "BUTTON") {
        return;
      }

      // this allows me to get the data-contactid attribute by getting to the div housing all of the information about the contact by going out two parents.The id was passed in dynamically in the handlebars template.
      let userId =
        e.target.parentNode.parentNode.getAttribute("data-contactid");

      // this gets the text of the button so we can use a conditional to check wether it is 'Edit' or 'Delete' and handle the event accordingly.
      let userChoice = e.target.textContent.trim();

      if (userChoice === "Edit") {
        this.editContact(userId);
      } else if (userChoice === "Delete") {
        this.deleteContact(userId);
      }
    }

    editContact(userId) {
      fetch(`http://localhost:3000/api/contacts/${userId}`, { method: "GET" })
        .then((res) => res.json())
        .then((json) => {
          document.querySelector(".contacts-container").innerHTML =
            this.compileTemplates()["edit-contact-template"]({
              full_name: json.full_name,
              phone_number: json.phone_number,
              email: json.email,
            });

          let form = document.querySelector("form.update-contact");
          let cancelButton = document.querySelector("#editContactCancel");
          let editContactSubmit = document.querySelector(
            "#edit-contact-submit"
          );
          form.addEventListener("submit", (e) => {
            e.preventDefault();

            let formData = new FormData(form);

            let data = {};

            // confirming my formData object is properly grabbing all input properly and giving the data object its state.
            for (let entry of formData.entries()) {
              data[entry[0]] = entry[1];
            }

            // console.log(data);

            fetch(
              `http://localhost:3000/api/contacts/${userId}
            `,
              {
                method: "PUT",
                body: JSON.stringify(data),
                headers: {
                  "Content-Type": "application/json; charset=utf-8",
                },
              }
            )
              .then((res) => {
                this.getAllContacts();
                console.log(res);
              })
              .catch((err) => console.log(err));
          });

          // event listener for the cancel button which takes us back to the home page with all of out contacts.
          cancelButton.addEventListener("click", (e) => {
            this.getAllContacts();
          });
        });
    }

    deleteContact(contactID) {
      // confirm that the user truly wants to delete the contact. Read their input and act accordingly. If yes, continue with the DELETE request, otherwise, do nothing.
      let answer = prompt(
        "Are you sure you want to delete this user? [y/n]"
      ).toLowerCase();
      if (answer === "y") {
        //delete the contact using fetch and appending the contactID to the end of the path as directed in the API documents
        fetch(`http://localhost:3000/api/contacts/${contactID}`, {
          method: "DELETE",
        })
          // re-render the contacts page by calling getAllContacts
          .then((res) => {
            console.log(res);
            this.getAllContacts();
          })
          .catch((err) => console.log(err));
      }
    }

    filterContacts(e) {
      let search = e.target.value.toLowerCase();
      let addContactSubmit = document.querySelector("#submitButton");
      let searchInput = document.querySelector("#search");

      let compiledTemplates = this.compileTemplates();
      let contacts = fetch("http://localhost:3000/api/contacts")
        .then((res) => res.json())
        .then((json) => {
          // use the includes method to search if any part of the full_name property includes what the user has typed this far.
          let matches = json.filter((contactObj) =>
            contactObj.full_name.toLowerCase().includes(search)
          );
          // json.filter(contactObj => contactObj.full_name.toLowerCase().slice(0, search.length) === search );

          document.querySelector(".contacts-container").innerHTML =
            compiledTemplates["contacts-template"]({ contacts: matches });

          // this resets the
          addContactSubmit.addEventListener("click", (e) => {
            searchInput.value = "";
          });
          // this checks to see if the button is avaialble to grab otherwise sets it to an empty string so that the conditional fails to run.
          let addContactsButton =
            document.querySelector("#no-contacts-button") || "";

          if (addContactsButton) {
            addContactsButton.addEventListener("click", (e) => {
              // must pass the event object in, otherwise an error is thrown.

              this.renderAddContactForm(e);
            });
          }
        });

      // this listens on the entire document for a click on a button or input el and resets the search bar.
      document.addEventListener("click", (e) => {
        if (e.target.nodeName === "BUTTON" || e.target.nodeName === "INPUT") {
          searchInput.value = "";
        }
      });
    }
  }

  let manager = new ContactsManager();
})();
