document.addEventListener("DOMContentLoaded", function () {
    const messages = document.getElementById("messages");
    const userInput = document.getElementById("userInput");
    const sendButton = document.getElementById("sendButton");

    sendButton.addEventListener("click", function () {
        let msg = userInput.value.trim();
        if (msg !== "") {
            addMessage("You", msg);
            userInput.value = "";

            // Simulate bot response with typing effect
            setTimeout(() => {
                addMessage("Bot", "Thinking...");
                setTimeout(() => {
                    messages.lastChild.textContent = "Hello, gamer!";
                }, 1000);
            }, 500);
        }
    });

    function addMessage(sender, text) {
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("message");
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }
});
