package handlers

import (
    "encoding/csv"
    "fmt"

    "github.com/Oblutack/NeptuneShipments/backend/internal/models"
    "github.com/Oblutack/NeptuneShipments/backend/internal/repository"
    "github.com/Oblutack/NeptuneShipments/backend/internal/services"
    "github.com/gofiber/fiber/v2"
)

type VesselHandler struct {
    repo            *repository.VesselRepository
    importerService *services.ImporterService
}

func NewVesselHandler(repo *repository.VesselRepository, importerService *services.ImporterService) *VesselHandler {
    return &VesselHandler{
        repo:            repo,
        importerService: importerService,
    }
}

// ✅ FIXED: GetAllVessels retrieves all vessels (FIBER)
func (h *VesselHandler) GetAllVessels(c *fiber.Ctx) error {
    vessels, err := h.repo.GetAll(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(vessels)
}

// ✅ FIXED: GetVesselByID retrieves a single vessel by ID (FIBER)
func (h *VesselHandler) GetVesselByID(c *fiber.Ctx) error {
    id := c.Params("id")

    vessel, err := h.repo.GetByID(c.Context(), id)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "Vessel not found"})
    }

    return c.JSON(vessel)
}

// ✅ FIXED: CreateVessel creates a new vessel (FIBER)
func (h *VesselHandler) CreateVessel(c *fiber.Ctx) error {
    var vessel models.Vessel
    if err := c.BodyParser(&vessel); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    // Set default values
    if vessel.Status == "" {
        vessel.Status = "IDLE"
    }

    if err := h.repo.Create(c.Context(), &vessel); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.Status(201).JSON(vessel)
}

// ✅ NEW: UpdateVessel updates an existing vessel (FIBER)
func (h *VesselHandler) UpdateVessel(c *fiber.Ctx) error {
    id := c.Params("id")

    // Check if vessel exists
    existingVessel, err := h.repo.GetByID(c.Context(), id)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "Vessel not found"})
    }

    var vessel models.Vessel
    if err := c.BodyParser(&vessel); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    // Keep the same ID and created_at
    vessel.ID = existingVessel.ID
    vessel.CreatedAt = existingVessel.CreatedAt

    if err := h.repo.Update(c.Context(), &vessel); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(vessel)
}

// ✅ NEW: DeleteVessel removes a vessel (FIBER)
func (h *VesselHandler) DeleteVessel(c *fiber.Ctx) error {
    id := c.Params("id")

    if err := h.repo.Delete(c.Context(), id); err != nil {
        return c.Status(409).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"message": "Vessel deleted successfully"})
}

// ✅ NEW: UploadVesselsCSV handles CSV file upload (FIBER)
func (h *VesselHandler) UploadVesselsCSV(c *fiber.Ctx) error {
    file, err := c.FormFile("file")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "No file uploaded"})
    }

    // Open the file
    src, err := file.Open()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": "Failed to open file"})
    }
    defer src.Close()

    // Import vessels
    count, err := h.importerService.ImportVessels(c.Context(), src)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Import failed: %s", err.Error())})
    }

    return c.JSON(fiber.Map{
        "message": "Vessels imported successfully",
        "count":   count,
    })
}

// ✅ NEW: DownloadVesselsTemplate generates CSV template (FIBER)
func (h *VesselHandler) DownloadVesselsTemplate(c *fiber.Ctx) error {
    c.Set("Content-Type", "text/csv")
    c.Set("Content-Disposition", "attachment; filename=vessels_template.csv")

    writer := csv.NewWriter(c.Response().BodyWriter())
    defer writer.Flush()

    headers := []string{"name", "imo_number", "type", "status", "latitude", "longitude", "heading", "speed_knots", "fuel_level", "fuel_capacity"}
    writer.Write(headers)

    example := []string{"MV Example", "IMO1234567", "CONTAINER", "IDLE", "51.5074", "-0.1278", "90", "15.5", "80", "100"}
    writer.Write(example)

    return nil
}

// RefuelVessel refuels a vessel (FIBER)
func (h *VesselHandler) RefuelVessel(c *fiber.Ctx) error {
    id := c.Params("id")
    if err := h.repo.RefuelVessel(c.Context(), id); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"status": "refueled", "message": "Vessel is back online"})
}