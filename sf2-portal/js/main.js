const resources = {
    specification: {
        title: "Smart Factory 2 Specification",
        content: `
            <h2>Smart Factory Technical Specification</h2>
            <p><strong>Smart Factory 2 is designed to immerse students in modern manufacturing and Industry 4.0 principles.</strong> It gives learners practical experience with automated transport, sensing, sorting, pneumatic handling, and integrated PLC control.</p>
            <h3>System Components</h3>
            <ul>
                <li><strong>Conveyor systems:</strong> variable-speed DC motor control and material transport simulation.</li>
                <li><strong>Sensing systems:</strong> optical, proximity, and colour sensing for positioning and quality control.</li>
                <li><strong>Pneumatic pick and place:</strong> actuators and vacuum gripping for automated handling tasks.</li>
                <li><strong>Motor control:</strong> DC and stepper motor drivers for conveyors and gantry movement.</li>
            </ul>
            <h3>Key Specifications</h3>
            <ul>
                <li><strong>Power Supply:</strong> 24V</li>
                <li><strong>Length:</strong> 720 mm</li>
                <li><strong>Width:</strong> 556 mm</li>
                <li><strong>Height:</strong> 316 mm</li>
                <li><strong>Product Code:</strong> AU5555</li>
                <li><strong>Curriculum Code:</strong> CP4902</li>
            </ul>
            <div class="document-link">
                <p><strong>Document status:</strong> Coming soon.</p>
            </div>
        `
    },
    curriculum: {
        title: "Smart Factory 2 Curriculum",
        content: `
            <h2>Smart Factory 2 and Industry 4.0 Curriculum (CP4902)</h2>
            <p><strong>63 pages of structured delivery content</strong> designed around guided worksheets and practical automation tasks.</p>
            <h3>Core Worksheets</h3>
            <ul>
                <li>Worksheet 1: Understanding Sensors</li>
                <li>Worksheet 2: Reject Mechanisms</li>
                <li>Worksheet 3: Understanding the Conveyor</li>
                <li>Worksheet 4: Sorting Counters</li>
                <li>Worksheet 5: Driving the Stepper Motor</li>
                <li>Worksheet 6: Understanding the Plunger</li>
                <li>Worksheet 7: Delivering Counters</li>
                <li>Worksheet 8: Robot Arm</li>
                <li>Worksheet 9: Commissioning the Cell</li>
                <li>Worksheet 10: Completing the Smart Factory</li>
                <li>Worksheet 11: Defects and Reset Sequence</li>
                <li>Worksheet 12: Vision System</li>
                <li>Worksheet 13: RFID</li>
                <li>Worksheet 14: Network and Communications</li>
                <li>Worksheet 15: Data Logging</li>
                <li>Worksheet 16: Analytics</li>
                <li>Worksheet 17: IO-Link</li>
                <li>Worksheet 18: Predictive Maintenance</li>
            </ul>
            <div class="document-link">
                <p><strong>Document status:</strong> Coming soon.</p>
            </div>
        `
    },
    "teachers-guide": {
        title: "Smart Factory 2 Teachers Guide",
        content: `
            <h2>Teacher Guide (CP7329T)</h2>
            <p>The teacher guide structures classroom delivery around three connected modules that learners bring together into a complete automated work cell.</p>
            <h3>Module Structure</h3>
            <ul>
                <li>Conveyor System</li>
                <li>Gantry System</li>
                <li>Robot Arm System</li>
            </ul>
            <h3>Delivery Options</h3>
            <ul>
                <li>One learner completes the full sequence.</li>
                <li>Three learners split the modules and integrate at the end.</li>
                <li>Use final integration as a collaborative project challenge.</li>
            </ul>
            <h3>Practical Sequence</h3>
            <ul>
                <li><strong>Step 1:</strong> Gantry pick-and-place, limit switches, pneumatics, and vacuum control.</li>
                <li><strong>Step 2:</strong> Conveyor sorting using DC motor PWM, light gates, and reject mechanisms.</li>
                <li><strong>Step 3:</strong> Robot arm sorting and full automation sequencing.</li>
            </ul>
            <div class="document-link">
                <p><strong>Document status:</strong> Coming soon.</p>
            </div>
        `
    },
    "user-manual": {
        title: "Smart Factory 2 User Manual",
        content: `
            <h2>Smart Factory Manual (CP5279)</h2>
            <p>The user manual covers setup, wiring, pneumatics, software loading, PLC and HMI options, robot-arm commissioning, and day-to-day operation.</p>
            <h3>Manual Topics</h3>
            <ul>
                <li>Product setup and system overview</li>
                <li>PLC options and loading software</li>
                <li>Wiring diagrams and pneumatics diagrams</li>
                <li>Robot arm setup and functionality testing</li>
                <li>Operating with Siemens PLC and HMI</li>
                <li>Programming and motion-control guidance</li>
            </ul>
            <h3>Included Hardware</h3>
            <ul>
                <li>Gantry, conveyor, sensor unit, paddles, vacuum generator, valves, manifold, counters, and bins</li>
                <li>Accessories including tubing, clips, and sensor holders</li>
            </ul>
            <div class="document-link">
                <p><strong>Document status:</strong> Coming soon.</p>
            </div>
        `
    },
    "tia-portal": {
        title: "Smart Factory 2 TIA Portal Project",
        content: `
            <h2>TIA Portal Project Download</h2>
            <p>This package includes the Smart Factory PLC and HMI project files used for delivery and commissioning.</p>
            <h3>Package Contents</h3>
            <ul>
                <li>Complete TIA Portal project files</li>
                <li>PLC program and HMI screens</li>
                <li>Tag definitions and data blocks</li>
                <li>Installation guidance</li>
            </ul>
            <h3>System Requirements</h3>
            <ul>
                <li>TIA Portal V17 or newer</li>
                <li>Windows 10 or 11</li>
                <li>8 GB RAM minimum</li>
                <li>10 GB free disk space</li>
            </ul>
            <div class="document-link">
                <p><strong>Download status:</strong> Coming soon.</p>
            </div>
        `
    },
    "quick-start": {
        title: "Smart Factory 2 Quick Start",
        content: `
            <h2>Quick Start Guide</h2>
            <div class="quick-step">
                <h4>1. Download the TIA Portal project</h4>
                <p>Use the project pack to get the PLC and HMI configuration ready.</p>
            </div>
            <div class="quick-step">
                <h4>2. Review the curriculum</h4>
                <p>Check the worksheet sequence and lesson outcomes before delivery.</p>
            </div>
            <div class="quick-step">
                <h4>3. Read the teachers guide</h4>
                <p>Use the suggested module split and integration strategy for your class.</p>
            </div>
            <div class="quick-step">
                <h4>4. Set up the hardware</h4>
                <p>Follow the user manual for wiring, pneumatics, and software loading.</p>
            </div>
            <div class="quick-step">
                <h4>5. Start with the foundation worksheets</h4>
                <p>Begin with sensors, conveyors, and safe operation before moving into full system integration.</p>
            </div>
        `
    },
    overview: {
        title: "Smart Factory 2 Overview",
        content: `
            <h2>System Overview</h2>
            <p>Smart Factory 2 provides a compact, self-contained manufacturing cell for teaching automation, controls, and Industry 4.0 workflows.</p>
            <h3>Key Technologies</h3>
            <ul>
                <li>Conveyor transport with variable-speed DC motor control</li>
                <li>Optical, proximity, and colour sensing for part detection and sorting</li>
                <li>Pneumatic pick-and-place with vacuum gripping</li>
                <li>Stepper motor gantry positioning</li>
                <li>Robot arm integration and automated sequencing</li>
                <li>PLC and HMI control for professional-grade automation delivery</li>
            </ul>
            <h3>Learning Objectives</h3>
            <ul>
                <li>Factory control and automation systems</li>
                <li>Software design for automated production</li>
                <li>DC motor and stepper-drive control</li>
                <li>Sensor-driven sorting and decision making</li>
                <li>System design across multiple controllers</li>
                <li>Industry 4.0 topics such as communications, data logging, and predictive maintenance</li>
            </ul>
            <div class="document-link">
                <a href="https://www.matrixtsl.com/smartfactory/" target="_blank" rel="noopener" class="btn btn-secondary">View Full Product Details</a>
            </div>
        `
    },
    "scheme-of-work": {
        title: "Smart Factory 2 Scheme of Work",
        content: `
            <h2>Scheme of Work - Smart Factory 2 and Industry 4.0</h2>
            <p>This suggested scheme of work aligns the Smart Factory curriculum to weekly outcomes, activities, and assessment. Adjust timing to suit your timetable.</p>
            <h3>Suggested 12-Week Structure</h3>
            <div class="sow-table">
                <div class="sow-head">
                    <div>Weeks</div><div>Focus</div><div>Topics</div><div>Activities</div><div>Assessment</div>
                </div>
                <div class="sow-row">
                    <div><strong>1-2</strong></div><div>Foundations</div><div>Industry 4.0, safety, sensor types, worksheet 1-3</div><div>Demonstration and guided tasks</div><div>Quiz and worksheet completion</div>
                </div>
                <div class="sow-row">
                    <div><strong>3-4</strong></div><div>Conveyors and Sorting</div><div>DC motors, PWM, reject mechanisms, worksheet 4-6</div><div>Practical sorting tasks</div><div>Observation checklist</div>
                </div>
                <div class="sow-row">
                    <div><strong>5-6</strong></div><div>Stepper and Gantry</div><div>Stepper control, gantry movement, plunger logic, worksheet 5-7</div><div>Programming and setup tasks</div><div>Peer review and practical task</div>
                </div>
                <div class="sow-row">
                    <div><strong>7-8</strong></div><div>Robot Integration</div><div>Robot arm operation, cell commissioning, worksheet 8-10</div><div>Integrated demonstration</div><div>Practical demo</div>
                </div>
                <div class="sow-row">
                    <div><strong>9-10</strong></div><div>Advanced Systems</div><div>Defects, reset sequence, vision, RFID, worksheet 11-13</div><div>Fault diagnosis work</div><div>Instructor observation</div>
                </div>
                <div class="sow-row">
                    <div><strong>11-12</strong></div><div>Data and Communications</div><div>Networks, logging, analytics, IO-Link, predictive maintenance, worksheet 14-18</div><div>Mini project and reflection</div><div>Integrated system review</div>
                </div>
            </div>
            <h3>Teaching Guidance</h3>
            <ul>
                <li>Demonstrate each module before learners work independently.</li>
                <li>Use small teams for conveyor, gantry, and robot roles.</li>
                <li>Build in short lesson checkpoints and reflections.</li>
                <li>Emphasize safe work around pneumatics and moving parts.</li>
            </ul>
        `
    }
};

let detailPanel;
let detailTitle;
let detailEyebrow;
let detailBody;
let portalSidebar;
let sidebarOverlay;
let sidebarToggle;
let pageTitle;

function openResource(resourceKey, sectionLabel) {
    const resource = resources[resourceKey];
    if (!resource || !detailPanel || !detailTitle || !detailBody) {
        return;
    }

    detailTitle.textContent = resource.title;
    detailEyebrow.textContent = sectionLabel || "Resource details";
    detailBody.innerHTML = resource.content;
    detailPanel.setAttribute("aria-hidden", "false");
    detailPanel.classList.add("open");
}

function closeDetailPanel() {
    if (!detailPanel) {
        return;
    }
    detailPanel.classList.remove("open");
    detailPanel.setAttribute("aria-hidden", "true");
    detailEyebrow.textContent = "Resource details";
    detailTitle.textContent = "Select a resource";
    detailBody.innerHTML = '<p class="detail-placeholder">Choose a resource to view specifications, curriculum notes, manuals, and download information.</p>';
}

function openSidebar() {
    if (!portalSidebar || !sidebarOverlay || !sidebarToggle) {
        return;
    }

    portalSidebar.classList.add("open");
    sidebarOverlay.hidden = false;
    sidebarOverlay.classList.add("visible");
    sidebarToggle.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
    if (!portalSidebar || !sidebarOverlay || !sidebarToggle) {
        return;
    }

    portalSidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
    sidebarOverlay.hidden = true;
    sidebarToggle.setAttribute("aria-expanded", "false");
}

function setActiveNav(sectionId) {
    document.querySelectorAll(".sidebar-link").forEach(function(link) {
        link.classList.toggle("active", link.getAttribute("href") === "#" + sectionId);
    });
}

function initializeSectionTracking() {
    const sections = document.querySelectorAll("main section[id]");
    if (!sections.length) {
        return;
    }

    const observer = new IntersectionObserver(function(entries) {
        const visibleEntry = entries
            .filter(function(entry) {
                return entry.isIntersecting;
            })
            .sort(function(a, b) {
                return b.intersectionRatio - a.intersectionRatio;
            })[0];

        if (!visibleEntry) {
            return;
        }

        const heading = visibleEntry.target.querySelector("h3");
        if (pageTitle && heading) {
            pageTitle.textContent = heading.textContent;
        }
        setActiveNav(visibleEntry.target.id);
    }, {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: "-20% 0px -45% 0px"
    });

    sections.forEach(function(section) {
        observer.observe(section);
    });
}

function initializeResourceActions() {
    document.addEventListener("click", function(event) {
        const resourceTrigger = event.target.closest("[data-resource]");
        if (resourceTrigger) {
            const sectionLabel =
                resourceTrigger.getAttribute("data-section-title") ||
                resourceTrigger.closest("[data-section-title]")?.getAttribute("data-section-title") ||
                resourceTrigger.closest(".section-group")?.querySelector("h3")?.textContent ||
                resourceTrigger.closest(".section-panel")?.querySelector("h3")?.textContent ||
                "Resource details";

            openResource(resourceTrigger.dataset.resource, sectionLabel);
            if (window.innerWidth <= 1080) {
                closeSidebar();
            }
            return;
        }

        const navLink = event.target.closest(".sidebar-link");
        if (navLink && window.innerWidth <= 1080) {
            closeSidebar();
        }
    });
}

function initializeSidebarToggle() {
    if (!sidebarToggle) {
        return;
    }

    sidebarToggle.addEventListener("click", function() {
        if (portalSidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay.addEventListener("click", closeSidebar);
}

function initializeDetailClose() {
    const closeButton = document.getElementById("detailClose");
    if (!closeButton) {
        return;
    }

    closeButton.addEventListener("click", closeDetailPanel);
}

function initializePortalInteractions() {
    detailPanel = document.getElementById("detailPanel");
    detailTitle = document.getElementById("detailTitle");
    detailEyebrow = document.getElementById("detailEyebrow");
    detailBody = document.getElementById("detailBody");
    portalSidebar = document.getElementById("portalSidebar");
    sidebarOverlay = document.getElementById("sidebarOverlay");
    sidebarToggle = document.getElementById("sidebarToggle");
    pageTitle = document.getElementById("pageTitle");

    initializeResourceActions();
    initializeSidebarToggle();
    initializeDetailClose();
    initializeSectionTracking();
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeDetailPanel();
        closeSidebar();
    }
});

window.addEventListener("resize", function() {
    if (window.innerWidth > 1080) {
        closeSidebar();
    }
    if (window.innerWidth > 1260) {
        closeDetailPanel();
    }
});

document.addEventListener("DOMContentLoaded", initializePortalInteractions);
