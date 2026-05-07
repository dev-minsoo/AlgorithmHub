(function () {
  if (window.__algorithmHubHackerrankBridgeInstalled) {
    return;
  }

  window.__algorithmHubHackerrankBridgeInstalled = true;

  var EVENT_NAME = "algorithmhub:hackerrank-submission";
  var SUBMISSION_PATH_PATTERN =
    /^\/rest\/contests\/([^/]+)\/challenges\/([^/]+)\/submissions(?:\/(\d+))?\/?$/;

  function getRequestUrl(input) {
    if (typeof input === "string") {
      return input;
    }

    if (input && typeof input.url === "string") {
      return input.url;
    }

    return "";
  }

  function getRequestMethod(input, init) {
    var initMethod = init && typeof init.method === "string" ? init.method : "";
    if (initMethod) {
      return initMethod.toUpperCase();
    }

    var inputMethod = input && typeof input.method === "string" ? input.method : "";
    return (inputMethod || "GET").toUpperCase();
  }

  function parseSubmissionRequest(url, method) {
    try {
      var parsedUrl = new URL(url, window.location.href);
      var match = parsedUrl.pathname.match(SUBMISSION_PATH_PATTERN);
      if (!match) {
        return null;
      }

      var submissionId = match[3] || "";
      if (method === "POST" && submissionId) {
        return null;
      }

      if (method === "GET" && !submissionId) {
        return null;
      }

      if (method !== "POST" && method !== "GET") {
        return null;
      }

      return {
        contestSlug: match[1],
        challengeSlug: match[2],
        submissionId: submissionId,
      };
    } catch (_error) {
      return null;
    }
  }

  function publishSubmission(body, request) {
    var model = body && body.model;
    if (!model || !model.id) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: JSON.stringify({
          submissionId: String(model.id || request.submissionId),
          contestSlug: model.contest_slug || request.contestSlug,
          challengeSlug:
            model.challenge_slug || model.slug || request.challengeSlug,
          submission: model,
        }),
      })
    );
  }

  function readJsonResponseText(text, request) {
    if (!text) {
      return;
    }

    try {
      publishSubmission(JSON.parse(text), request);
    } catch (_error) {
      // Ignore non-JSON responses.
    }
  }

  if (typeof window.fetch === "function") {
    var originalFetch = window.fetch;
    window.fetch = function (input, init) {
      var request = parseSubmissionRequest(
        getRequestUrl(input),
        getRequestMethod(input, init)
      );

      return originalFetch.apply(this, arguments).then(function (response) {
        if (request) {
          response
            .clone()
            .json()
            .then(function (body) {
              publishSubmission(body, request);
            })
            .catch(function () {
              // The page still receives the original response.
            });
        }

        return response;
      });
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__algorithmHubHackerrankRequest = parseSubmissionRequest(
      String(url || ""),
      String(method || "GET").toUpperCase()
    );
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    if (this.__algorithmHubHackerrankRequest) {
      this.addEventListener("load", function () {
        var request = this.__algorithmHubHackerrankRequest;
        if (!request) {
          return;
        }

        if (this.responseType === "json") {
          publishSubmission(this.response, request);
          return;
        }

        if (!this.responseType || this.responseType === "text") {
          readJsonResponseText(this.responseText, request);
        }
      });
    }

    return originalSend.apply(this, arguments);
  };
})();
